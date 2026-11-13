import { createHash, randomBytes } from 'crypto';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Response } from 'express';
import { IsNull, LessThan, Repository } from 'typeorm';
import { RolesService, UserAccess } from '../roles/roles.service';
import { User } from '../users/entities/user.entity';
import { PublicUser, UsersService } from '../users/users.service';
import { RefreshToken } from './entities/refresh-token.entity';

/** Utilisateur renvoyé au frontend : infos publiques + rôles + permissions. */
export type SessionUser = PublicUser & UserAccess;

const REUSE_GRACE_MS = 10_000;
const PURGE_EVERY_MS = 6 * 60 * 60 * 1000; // 6 heures

@Injectable()
export class AuthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuthService.name);
  private purgeTimer?: NodeJS.Timeout;

  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
  ) {}

  /** Au démarrage, puis toutes les 6 h : suppression des jetons expirés. */
  onModuleInit() {
    void this.purgeExpiredTokens();
    this.purgeTimer = setInterval(() => void this.purgeExpiredTokens(), PURGE_EVERY_MS);
    // unref : ce minuteur n'empêche pas le processus de s'arrêter.
    this.purgeTimer.unref();
  }

  onModuleDestroy() {
    if (this.purgeTimer) clearInterval(this.purgeTimer);
  }

  /**
   * Un jeton expiré ne peut plus servir : le garder ne fait que grossir la
   * table. Les jetons révoqués NON expirés sont conservés, car ils servent à
   * détecter la réutilisation d'un jeton volé.
   */
  async purgeExpiredTokens(): Promise<number> {
    try {
      const result = await this.refreshTokens.delete({ expiresAt: LessThan(new Date()) });
      const count = result.affected ?? 0;
      if (count > 0) this.logger.log(`${count} jeton(s) de session expiré(s) supprimé(s).`);
      return count;
    } catch (error) {
      // Une purge ratée ne doit jamais faire tomber l'application.
      this.logger.warn(`Purge des jetons impossible : ${String(error)}`);
      return 0;
    }
  }

  async login(phone: string, password: string) {
    const user = await this.usersService.validateCredentials(phone, password);
    return this.createSession(user.id, await this.buildSessionUser(user));
  }

  async refresh(rawToken: string | undefined) {
    const stored = await this.findStoredToken(rawToken);

    if (stored.revokedAt) {
      return this.rejectRevokedToken(stored.userId, stored.revokedAt);
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Session expirée.');
    }

    const user = await this.usersService.findActiveById(stored.userId);
    if (!user) {
      throw new UnauthorizedException('Session expirée.');
    }

    // Révocation atomique : MySQL ne modifie la ligne que si elle n'est pas
    // déjà révoquée. Si deux requêtes arrivent en même temps avec le même
    // jeton, une seule obtient affected = 1 ; l'autre est refusée.
    const result = await this.refreshTokens.update(
      { id: stored.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    if (!result.affected) {
      throw new UnauthorizedException('Session déjà renouvelée.');
    }

    return this.createSession(user.id, await this.buildSessionUser(user));
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) {
      return;
    }

    await this.refreshTokens.update(
      { tokenHash: this.hashToken(rawToken), revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    await this.usersService.changePassword(
      userId,
      currentPassword,
      newPassword,
    );
    await this.revokeAll(userId);
  }

  setRefreshCookie(response: Response, rawToken: string) {
    const days = this.refreshTtlDays();
    response.cookie('refresh_token', rawToken, {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: days * 24 * 60 * 60 * 1000,
    });
  }

  clearRefreshCookie(response: Response) {
    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/api/auth',
    });
  }

  /**
   * Le frontend s'en sert pour adapter les menus. Ce n'est pas une sécurité :
   * PermissionsGuard revérifie en base à chaque requête.
   */
  async buildSessionUser(user: User): Promise<SessionUser> {
    const access = await this.rolesService.getUserAccess(user.id);
    return { ...this.usersService.toPublic(user), ...access };
  }

  private async createSession(userId: number, user: SessionUser) {
    const accessToken = await this.jwtService.signAsync({ sub: userId });
    const refreshToken = await this.issueRefreshToken(userId);
    return { accessToken, refreshToken, user };
  }

  private async issueRefreshToken(userId: number): Promise<string> {
    const rawToken = randomBytes(48).toString('base64url');
    const days = this.refreshTtlDays();
    await this.refreshTokens.save(
      this.refreshTokens.create({
        userId,
        tokenHash: this.hashToken(rawToken),
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
        revokedAt: null,
      }),
    );
    return rawToken;
  }

  private async findStoredToken(rawToken: string | undefined) {
    if (!rawToken) {
      throw new UnauthorizedException('Session expirée.');
    }

    const stored = await this.refreshTokens.findOne({
      where: { tokenHash: this.hashToken(rawToken) },
    });
    if (!stored) {
      throw new UnauthorizedException('Session expirée.');
    }
    return stored;
  }

  /**
   * Un jeton déjà révoqué est présenté à nouveau.
   * - Révoqué il y a quelques secondes : c'est presque toujours un double
   *   refresh légitime (deux onglets, React StrictMode). On refuse seulement.
   * - Révoqué depuis plus longtemps : le jeton a probablement été volé.
   *   On ferme toutes les sessions de l'utilisateur par précaution.
   */
  private async rejectRevokedToken(
    userId: number,
    revokedAt: Date,
  ): Promise<never> {
    if (Date.now() - revokedAt.getTime() > REUSE_GRACE_MS) {
      await this.revokeAll(userId);
    }
    throw new UnauthorizedException('Session révoquée. Reconnecte-toi.');
  }

  private async revokeAll(userId: number) {
    await this.refreshTokens.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private refreshTtlDays(): number {
    const days = Number(this.config.get<string>('JWT_REFRESH_TTL_DAYS') ?? 7);
    return Number.isFinite(days) && days > 0 ? days : 7;
  }
}

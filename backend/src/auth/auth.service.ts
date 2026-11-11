import { createHash, randomBytes } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Response } from 'express';
import { IsNull, Repository } from 'typeorm';
import { PublicUser, UsersService } from '../users/users.service';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: Repository<RefreshToken>,
  ) {}

  async login(phone: string, password: string) {
    const user = await this.usersService.validateCredentials(phone, password);
    return this.createSession(user.id, this.usersService.toPublic(user));
  }

  async refresh(rawToken: string | undefined) {
    const stored = await this.findStoredToken(rawToken);

    if (stored.revokedAt) {
      await this.revokeAll(stored.userId);
      throw new UnauthorizedException('Session révoquée. Reconnecte-toi.');
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Session expirée.');
    }

    const user = await this.usersService.findActiveById(stored.userId);
    if (!user) {
      throw new UnauthorizedException('Session expirée.');
    }

    stored.revokedAt = new Date();
    await this.refreshTokens.save(stored);

    return this.createSession(user.id, this.usersService.toPublic(user));
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
      sameSite: 'lax',
      path: '/api/auth',
    });
  }

  private async createSession(userId: number, user: PublicUser) {
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

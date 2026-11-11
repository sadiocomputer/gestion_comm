import { randomBytes } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { isDuplicateEntry } from '../common/utils/database';
import { normalizeGuineaPhone } from '../common/utils/phone';
import { RoleSummary, RolesService } from '../roles/roles.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

export type PublicUser = {
  id: number;
  name: string;
  phone: string;
  isActive: boolean;
  createdAt: Date;
};

export type UserWithRoles = PublicUser & { roles: RoleSummary[] };

export type PaginatedUsers = {
  data: UserWithRoles[];
  total: number;
  page: number;
  limit: number;
};

@Injectable()
export class UsersService {
  private dummyHash?: Promise<string>;

  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly rolesService: RolesService,
  ) {}

  async create(dto: CreateUserDto): Promise<PublicUser> {
    // Normalisé aussi ici car le seed appelle create() sans passer par le DTO.
    const phone = normalizeGuineaPhone(dto.phone);
    if (!phone) {
      throw new BadRequestException('Numéro de téléphone invalide.');
    }

    const existing = await this.users.findOne({ where: { phone } });
    if (existing) {
      throw new ConflictException('Ce numéro est déjà utilisé.');
    }

    const passwordHash = await argon2.hash(dto.password);
    let user: User;
    try {
      user = await this.users.save(
        this.users.create({
          name: dto.name.trim(),
          phone,
          passwordHash,
          isActive: true,
        }),
      );
    } catch (error) {
      // Deux créations simultanées du même numéro : l'index unique de MySQL
      // bloque la seconde. On renvoie 409 au lieu d'une erreur 500.
      if (isDuplicateEntry(error)) {
        throw new ConflictException('Ce numéro est déjà utilisé.');
      }
      throw error;
    }

    return this.toPublic(user);
  }

  async list(page: number, limit: number): Promise<PaginatedUsers> {
    const [users, total] = await this.users.findAndCount({
      relations: { roles: true },
      order: { name: 'ASC', id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data: users.map((user) => this.toWithRoles(user)),
      total,
      page,
      limit,
    };
  }

  async findDetail(id: number): Promise<UserWithRoles> {
    const user = await this.users.findOne({
      where: { id },
      relations: { roles: true },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }
    return this.toWithRoles(user);
  }

  async update(id: number, dto: UpdateUserDto): Promise<UserWithRoles> {
    const user = await this.users.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    const changes: Partial<Pick<User, 'name' | 'phone'>> = {};
    if (dto.name !== undefined && dto.name !== user.name) {
      changes.name = dto.name;
    }
    if (dto.phone !== undefined && dto.phone !== user.phone) {
      if (await this.users.existsBy({ phone: dto.phone })) {
        throw new ConflictException('Ce numéro est déjà utilisé.');
      }
      changes.phone = dto.phone;
    }

    if (Object.keys(changes).length > 0) {
      try {
        await this.users.update({ id }, changes);
      } catch (error) {
        if (isDuplicateEntry(error)) {
          throw new ConflictException('Ce numéro est déjà utilisé.');
        }
        throw error;
      }
    }
    return this.findDetail(id);
  }

  /**
   * Active ou désactive un compte. À la désactivation, toutes ses sessions
   * sont fermées ; JwtStrategy refuse déjà son access token (is_active = 0).
   */
  async setActive(
    id: number,
    isActive: boolean,
    actorId: number,
  ): Promise<UserWithRoles> {
    if (id === actorId && !isActive) {
      throw new BadRequestException(
        'Tu ne peux pas désactiver ton propre compte.',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(User);
      if (!(await repo.existsBy({ id }))) {
        throw new NotFoundException('Utilisateur introuvable.');
      }
      await repo.update({ id }, { isActive });

      if (!isActive) {
        await this.revokeSessions(manager, id);
        // Si c'était le dernier administrateur actif : tout est annulé.
        await this.rolesService.assertActiveAdminRemains(manager);
      }
    });
    return this.findDetail(id);
  }

  /** Réinitialisation par un administrateur ; ferme toutes ses sessions. */
  async resetPassword(
    id: number,
    newPassword: string,
    actorId: number,
  ): Promise<void> {
    if (id === actorId) {
      throw new BadRequestException(
        'Pour ton propre compte, utilise « Mon profil ».',
      );
    }

    const passwordHash = await argon2.hash(newPassword);
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(User);
      if (!(await repo.existsBy({ id }))) {
        throw new NotFoundException('Utilisateur introuvable.');
      }
      await repo.update({ id }, { passwordHash });
      await this.revokeSessions(manager, id);
    });
  }

  private async revokeSessions(manager: EntityManager, userId: number) {
    await manager
      .getRepository(RefreshToken)
      .update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  private toWithRoles(user: User): UserWithRoles {
    return {
      ...this.toPublic(user),
      roles: (user.roles ?? [])
        .map((role) => ({ id: role.id, name: role.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  async findActiveById(id: number): Promise<User | null> {
    return this.users.findOne({ where: { id, isActive: true } });
  }

  async validateCredentials(phone: string, password: string): Promise<User> {
    const user = await this.users.findOne({
      where: { phone: normalizeGuineaPhone(phone) ?? phone },
      select: {
        id: true,
        name: true,
        phone: true,
        passwordHash: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      // On calcule quand même un Argon2 pour que la réponse prenne le même
      // temps : sinon on pourrait deviner quels numéros ont un compte.
      await argon2.verify(await this.getDummyHash(), password);
      throw new UnauthorizedException('Téléphone ou mot de passe incorrect.');
    }

    const passwordMatches = await argon2.verify(user.passwordHash, password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Téléphone ou mot de passe incorrect.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Ce compte est désactivé.');
    }

    return user;
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.users.findOne({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        passwordHash: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Session expirée.');
    }

    const passwordMatches = await argon2.verify(
      user.passwordHash,
      currentPassword,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Mot de passe actuel incorrect.');
    }

    if (currentPassword === newPassword) {
      throw new ConflictException(
        'Le nouveau mot de passe doit être différent.',
      );
    }

    user.passwordHash = await argon2.hash(newPassword);
    await this.users.save(user);
  }

  async seedAdminIfEmpty(): Promise<boolean> {
    const count = await this.users.count();
    if (count > 0) {
      return false;
    }

    await this.create({
      name: this.config.getOrThrow<string>('ADMIN_NAME'),
      phone: this.config.getOrThrow<string>('ADMIN_PHONE'),
      password: this.config.getOrThrow<string>('ADMIN_PASSWORD'),
    });
    return true;
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= argon2.hash(randomBytes(32).toString('hex'));
    return this.dummyHash;
  }

  toPublic(user: User): PublicUser {
    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}

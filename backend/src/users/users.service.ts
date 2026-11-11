import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';

export type PublicUser = {
  id: number;
  name: string;
  phone: string;
  isActive: boolean;
  createdAt: Date;
};

function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, '');
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateUserDto): Promise<PublicUser> {
    const phone = normalizePhone(dto.phone);
    const existing = await this.users.findOne({ where: { phone } });
    if (existing) {
      throw new ConflictException('Ce numéro est déjà utilisé.');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.users.save(
      this.users.create({
        name: dto.name.trim(),
        phone,
        passwordHash,
        isActive: true,
      }),
    );

    return this.toPublic(user);
  }

  async list(): Promise<PublicUser[]> {
    const users = await this.users.find({ order: { name: 'ASC' } });
    return users.map((user) => this.toPublic(user));
  }

  async findActiveById(id: number): Promise<User | null> {
    return this.users.findOne({ where: { id, isActive: true } });
  }

  async validateCredentials(phone: string, password: string): Promise<User> {
    const user = await this.users.findOne({
      where: { phone: normalizePhone(phone) },
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

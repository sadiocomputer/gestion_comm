import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { isDuplicateEntry } from '../common/utils/database';
import { User } from '../users/entities/user.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import {
  ADMIN_ROLE_NAME,
  DEFAULT_ROLES,
  PERMISSIONS,
} from './permissions.catalog';

export type RoleSummary = { id: number; name: string };

export type RoleResponse = {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  userCount: number;
};

export type UserAccess = {
  roles: RoleSummary[];
  permissions: string[];
};

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private readonly dataSource: DataSource) {}

  // ---------------------------------------------------------------------------
  // Droits d'un utilisateur (utilisé par PermissionsGuard et par la session)
  // ---------------------------------------------------------------------------

  /** Union des permissions de tous les rôles de l'utilisateur. */
  async getUserPermissionCodes(userId: number): Promise<Set<string>> {
    // Requête SQL paramétrée (le "?" empêche toute injection SQL).
    const rows = (await this.dataSource.query(
      `SELECT DISTINCT p.code
         FROM permissions p
         JOIN role_permissions rp ON rp.permission_id = p.id
         JOIN user_roles ur ON ur.role_id = rp.role_id
        WHERE ur.user_id = ?`,
      [userId],
    )) as { code: string }[];
    return new Set(rows.map((row) => row.code));
  }

  /** Pour adapter une réponse (ex. masquer les prix d'achat). */
  async userHasPermission(userId: number, code: string): Promise<boolean> {
    return (await this.getUserPermissionCodes(userId)).has(code);
  }

  async getUserAccess(userId: number): Promise<UserAccess> {
    const roles = (await this.dataSource.query(
      `SELECT r.id, r.name
         FROM roles r
         JOIN user_roles ur ON ur.role_id = r.id
        WHERE ur.user_id = ?
        ORDER BY r.name`,
      [userId],
    )) as RoleSummary[];
    const permissions = await this.getUserPermissionCodes(userId);
    return {
      roles: roles.map((role) => ({ id: Number(role.id), name: role.name })),
      permissions: [...permissions].sort(),
    };
  }

  // ---------------------------------------------------------------------------
  // Consultation
  // ---------------------------------------------------------------------------

  listPermissions(): Promise<Permission[]> {
    return this.dataSource
      .getRepository(Permission)
      .find({ order: { module: 'ASC', id: 'ASC' } });
  }

  async listRoles(): Promise<RoleResponse[]> {
    const roles = await this.dataSource.getRepository(Role).find({
      relations: { permissions: true },
      order: { name: 'ASC' },
    });
    const counts = await this.countUsersByRole();
    return roles.map((role) => this.toResponse(role, counts.get(role.id) ?? 0));
  }

  async findRole(id: number): Promise<RoleResponse> {
    const role = await this.getRoleOrFail(id);
    const counts = await this.countUsersByRole();
    return this.toResponse(role, counts.get(role.id) ?? 0);
  }

  // ---------------------------------------------------------------------------
  // Création, modification, suppression
  // ---------------------------------------------------------------------------

  async createRole(dto: CreateRoleDto): Promise<RoleResponse> {
    const repo = this.dataSource.getRepository(Role);
    await this.assertNameAvailable(dto.name);
    const permissions = await this.findPermissionsByCodes(dto.permissionCodes);

    try {
      const role = await repo.save(
        repo.create({
          name: dto.name,
          description: dto.description || null,
          isSystem: false,
          permissions,
        }),
      );
      return this.toResponse(role, 0);
    } catch (error) {
      if (isDuplicateEntry(error)) {
        throw new ConflictException('Un rôle porte déjà ce nom.');
      }
      throw error;
    }
  }

  async updateRole(id: number, dto: UpdateRoleDto): Promise<RoleResponse> {
    const role = await this.getRoleOrFail(id);
    if (role.isSystem) {
      throw new ForbiddenException(
        'Le rôle Administrateur ne peut pas être modifié.',
      );
    }

    if (dto.name !== undefined && dto.name !== role.name) {
      await this.assertNameAvailable(dto.name, role.id);
      role.name = dto.name;
    }
    if (dto.description !== undefined) {
      role.description = dto.description || null;
    }
    if (dto.permissionCodes !== undefined) {
      role.permissions = await this.findPermissionsByCodes(
        dto.permissionCodes,
      );
    }

    try {
      await this.dataSource.getRepository(Role).save(role);
    } catch (error) {
      if (isDuplicateEntry(error)) {
        throw new ConflictException('Un rôle porte déjà ce nom.');
      }
      throw error;
    }
    return this.findRole(role.id);
  }

  async deleteRole(id: number): Promise<void> {
    const role = await this.getRoleOrFail(id);
    if (role.isSystem) {
      throw new ForbiddenException(
        'Le rôle Administrateur ne peut pas être supprimé.',
      );
    }

    const userCount = (await this.countUsersByRole()).get(role.id) ?? 0;
    if (userCount > 0) {
      throw new ConflictException(
        `Ce rôle est attribué à ${userCount} utilisateur(s). Retire-le d'abord.`,
      );
    }

    await this.dataSource.getRepository(Role).remove(role);
  }

  // ---------------------------------------------------------------------------
  // Attribution des rôles à un utilisateur
  // ---------------------------------------------------------------------------

  /** Remplace tous les rôles de l'utilisateur par ceux indiqués. */
  async setUserRoles(
    userId: number,
    roleIds: number[],
  ): Promise<{ id: number; name: string; roles: RoleSummary[] }> {
    // Transaction : si la règle "un administrateur minimum" échoue à la fin,
    // MySQL annule aussi le changement de rôles.
    return this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const user = await userRepo.findOne({
        where: { id: userId },
        relations: { roles: true },
      });
      if (!user) {
        throw new NotFoundException('Utilisateur introuvable.');
      }

      const roles =
        roleIds.length > 0
          ? await manager.getRepository(Role).findBy({ id: In(roleIds) })
          : [];
      if (roles.length !== roleIds.length) {
        throw new BadRequestException('Rôle introuvable.');
      }

      user.roles = roles;
      await userRepo.save(user);
      await this.assertActiveAdminRemains(manager);

      return {
        id: user.id,
        name: user.name,
        roles: roles.map((role) => ({ id: role.id, name: role.name })),
      };
    });
  }

  /**
   * Empêche de se retrouver sans aucun administrateur actif (plus personne
   * ne pourrait gérer les accès). Sera réutilisé lors de la désactivation
   * d'un utilisateur (phase 4).
   */
  async assertActiveAdminRemains(manager: EntityManager): Promise<void> {
    const [row] = (await manager.query(
      `SELECT COUNT(*) AS count
         FROM user_roles ur
         JOIN users u ON u.id = ur.user_id
         JOIN roles r ON r.id = ur.role_id
        WHERE r.is_system = 1 AND u.is_active = 1`,
    )) as { count: string | number }[];

    if (Number(row?.count ?? 0) === 0) {
      throw new ConflictException(
        'Il doit rester au moins un administrateur actif.',
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Seed (utilisé par "npm run seed")
  // ---------------------------------------------------------------------------

  /**
   * Recopie le catalogue en base et prépare les rôles de départ.
   * Peut être relancé sans risque : ne crée que ce qui manque.
   */
  async syncCatalog(): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const permissionRepo = manager.getRepository(Permission);
      const roleRepo = manager.getRepository(Role);

      for (const item of PERMISSIONS) {
        const existing = await permissionRepo.findOneBy({ code: item.code });
        if (!existing) {
          await permissionRepo.save(permissionRepo.create({ ...item }));
        } else if (
          existing.label !== item.label ||
          existing.module !== item.module
        ) {
          existing.label = item.label;
          existing.module = item.module;
          await permissionRepo.save(existing);
        }
      }

      const catalogCodes = new Set<string>(PERMISSIONS.map((p) => p.code));
      const allPermissions = await permissionRepo.find();
      const catalogPermissions = allPermissions.filter((p) =>
        catalogCodes.has(p.code),
      );

      const obsolete = allPermissions.filter((p) => !catalogCodes.has(p.code));
      if (obsolete.length > 0) {
        this.logger.warn(
          `Permissions absentes du catalogue (conservées) : ${obsolete
            .map((p) => p.code)
            .join(', ')}`,
        );
      }

      const admin =
        (await roleRepo.findOne({
          where: { name: ADMIN_ROLE_NAME },
          relations: { permissions: true },
        })) ??
        roleRepo.create({
          name: ADMIN_ROLE_NAME,
          description: "Accès complet à l'application.",
        });
      admin.isSystem = true;
      admin.permissions = catalogPermissions;
      await roleRepo.save(admin);

      for (const definition of DEFAULT_ROLES) {
        if (await roleRepo.existsBy({ name: definition.name })) {
          continue;
        }
        const wanted = new Set<string>(definition.permissions);
        await roleRepo.save(
          roleRepo.create({
            name: definition.name,
            description: definition.description,
            isSystem: false,
            permissions: catalogPermissions.filter((p) => wanted.has(p.code)),
          }),
        );
      }
    });
  }

  /** Attribue le rôle Administrateur à l'utilisateur de ce numéro. */
  async grantAdminRole(phone: string): Promise<User> {
    return this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const user = await userRepo.findOne({
        where: { phone },
        relations: { roles: true },
      });
      if (!user) {
        throw new Error(
          `ADMIN_PHONE (${phone}) ne correspond à aucun utilisateur. ` +
            'Corrige le .env puis relance le seed.',
        );
      }

      const admin = await manager
        .getRepository(Role)
        .findOneByOrFail({ name: ADMIN_ROLE_NAME });

      if (!user.roles.some((role) => role.id === admin.id)) {
        user.roles.push(admin);
        await userRepo.save(user);
      }
      return user;
    });
  }

  // ---------------------------------------------------------------------------
  // Outils internes
  // ---------------------------------------------------------------------------

  private async getRoleOrFail(id: number): Promise<Role> {
    const role = await this.dataSource.getRepository(Role).findOne({
      where: { id },
      relations: { permissions: true },
    });
    if (!role) {
      throw new NotFoundException('Rôle introuvable.');
    }
    return role;
  }

  private async assertNameAvailable(name: string, exceptId?: number) {
    // La collation utf8mb4_unicode_ci ignore la casse : "vendeur" = "Vendeur".
    const existing = await this.dataSource
      .getRepository(Role)
      .findOneBy({ name });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('Un rôle porte déjà ce nom.');
    }
  }

  private async findPermissionsByCodes(codes: string[]): Promise<Permission[]> {
    if (codes.length === 0) {
      return [];
    }
    const permissions = await this.dataSource
      .getRepository(Permission)
      .findBy({ code: In(codes) });
    if (permissions.length !== codes.length) {
      // Le code existe dans le catalogue mais pas en base : seed non relancé.
      throw new BadRequestException(
        'Permission inconnue en base. Relance "npm run seed".',
      );
    }
    return permissions;
  }

  private async countUsersByRole(): Promise<Map<number, number>> {
    const rows = (await this.dataSource.query(
      'SELECT role_id AS roleId, COUNT(*) AS count FROM user_roles GROUP BY role_id',
    )) as { roleId: number | string; count: number | string }[];
    return new Map(rows.map((row) => [Number(row.roleId), Number(row.count)]));
  }

  private toResponse(role: Role, userCount: number): RoleResponse {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: (role.permissions ?? []).map((p) => p.code).sort(),
      userCount,
    };
  }
}

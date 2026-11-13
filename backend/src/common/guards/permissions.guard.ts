import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PermissionCode } from '../../roles/permissions.catalog';
import { RolesService } from '../../roles/roles.service';
import type { User } from '../../users/entities/user.entity';
import {
  ANY_PERMISSION_KEY,
  PERMISSIONS_KEY,
} from '../decorators/require-permissions.decorator';

/**
 * À utiliser APRÈS JwtAuthGuard : @UseGuards(JwtAuthGuard, PermissionsGuard)
 * Les permissions sont relues en base à chaque requête : un retrait de droit
 * s'applique immédiatement, sans attendre l'expiration du token.
 *
 * INTERDIT PAR DÉFAUT : une route protégée par ce guard mais sans étiquette
 * (@RequirePermissions ou @RequireAnyPermission) est refusée. Un oubli ne
 * peut donc pas ouvrir une route à tout le monde.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const all = this.reflector.getAllAndOverride<PermissionCode[] | undefined>(PERMISSIONS_KEY, targets);
    const any = this.reflector.getAllAndOverride<PermissionCode[] | undefined>(ANY_PERMISSION_KEY, targets);

    if (!all?.length && !any?.length) {
      // Erreur de développement : on la signale dans les logs.
      this.logger.error(
        `Route sans permission déclarée : ${context.getClass().name}.${context.getHandler().name} (refusée)`,
      );
      throw new ForbiddenException('Accès refusé.');
    }

    const request = context.switchToHttp().getRequest<{ user?: User }>();
    if (!request.user) {
      throw new UnauthorizedException('Session expirée.');
    }

    const granted = await this.rolesService.getUserPermissionCodes(request.user.id);
    const allOk = !all?.length || all.every((p) => granted.has(p));
    const anyOk = !any?.length || any.some((p) => granted.has(p));
    if (!allOk || !anyOk) {
      throw new ForbiddenException('Accès refusé.');
    }
    return true;
  }
}

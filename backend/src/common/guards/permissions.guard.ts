import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PermissionCode } from '../../roles/permissions.catalog';
import { RolesService } from '../../roles/roles.service';
import type { User } from '../../users/entities/user.entity';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

/**
 * À utiliser APRÈS JwtAuthGuard : @UseGuards(JwtAuthGuard, PermissionsGuard)
 * Les permissions sont relues en base à chaque requête : un retrait de droit
 * s'applique immédiatement, sans attendre l'expiration du token.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Étiquette posée sur la méthode, sinon sur le controller.
    const required = this.reflector.getAllAndOverride<
      PermissionCode[] | undefined
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: User }>();
    if (!request.user) {
      throw new UnauthorizedException('Session expirée.');
    }

    const granted = await this.rolesService.getUserPermissionCodes(
      request.user.id,
    );
    if (!required.every((permission) => granted.has(permission))) {
      throw new ForbiddenException('Accès refusé.');
    }
    return true;
  }
}

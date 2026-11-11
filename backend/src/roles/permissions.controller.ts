import { Controller, Get, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesService } from './roles.service';

/** Lecture seule : les permissions viennent du catalogue, pas de l'interface. */
@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('roles.read')
  list() {
    return this.rolesService.listPermissions();
  }
}

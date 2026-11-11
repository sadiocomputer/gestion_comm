import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('roles.read')
  list() {
    return this.rolesService.listRoles();
  }

  // ParseIntPipe : "/roles/abc" -> 400 au lieu d'une requête SQL absurde.
  @Get(':id')
  @RequirePermissions('roles.read')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findRole(id);
  }

  @Post()
  @RequirePermissions('roles.create')
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.createRole(dto);
  }

  @Patch(':id')
  @RequirePermissions('roles.update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto) {
    return this.rolesService.updateRole(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions('roles.delete')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.rolesService.deleteRole(id);
  }
}

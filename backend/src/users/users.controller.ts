import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AssignRolesDto } from '../roles/dto/assign-roles.dto';
import { RolesService } from '../roles/roles.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SetUserStatusDto } from './dto/set-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
  ) {}

  @Get()
  @RequirePermissions('users.read')
  list(@Query() query: ListUsersQueryDto) {
    return this.usersService.list(query.page, query.limit);
  }

  @Post()
  @RequirePermissions('users.create')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get(':id')
  @RequirePermissions('users.read')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findDetail(id);
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('users.update')
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetUserStatusDto,
    @CurrentUser() actor: User,
  ) {
    return this.usersService.setActive(id, dto.isActive, actor.id);
  }

  @Patch(':id/password')
  @RequirePermissions('users.update')
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() actor: User,
  ) {
    await this.usersService.resetPassword(id, dto.newPassword, actor.id);
    return { message: 'Mot de passe réinitialisé. Ses sessions sont fermées.' };
  }

  @Put(':id/roles')
  @RequirePermissions('roles.assign')
  setRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignRolesDto,
  ) {
    return this.rolesService.setUserRoles(id, dto.roleIds);
  }
}

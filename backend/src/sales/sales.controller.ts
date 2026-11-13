import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  RequireAnyPermission,
  RequirePermissions,
} from '../common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesService } from '../roles/roles.service';
import { User } from '../users/entities/user.entity';
import { CancelSaleDto, CreateSaleDto, ListSalesQueryDto } from './dto/sale.dto';
import { SalesService, Viewer } from './sales.service';

@Controller('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly rolesService: RolesService,
  ) {}

  @Post()
  @RequirePermissions('sales.create')
  async create(@Body() dto: CreateSaleDto, @CurrentUser() user: User) {
    return this.salesService.create(dto, await this.viewer(user));
  }

  // "sales.read" (toutes les ventes) OU "sales.create" (le service limite
  // alors la liste aux ventes de l'utilisateur).
  @Get()
  @RequireAnyPermission('sales.read', 'sales.create')
  async list(@Query() query: ListSalesQueryDto, @CurrentUser() user: User) {
    return this.salesService.list(query, await this.viewer(user));
  }

  @Get(':id')
  @RequireAnyPermission('sales.read', 'sales.create')
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.salesService.findOne(id, await this.viewer(user));
  }

  @Post(':id/cancel')
  @RequirePermissions('sales.cancel')
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelSaleDto,
    @CurrentUser() user: User,
  ) {
    return this.salesService.cancel(id, dto.reason, await this.viewer(user));
  }

  /** Qui consulte : ses permissions décident de ce qu'il voit. */
  private async viewer(user: User): Promise<Viewer> {
    const permissions = await this.rolesService.getUserPermissionCodes(user.id);
    return { id: user.id, permissions };
  }
}

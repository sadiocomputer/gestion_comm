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
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RolesService } from '../roles/roles.service';
import { User } from '../users/entities/user.entity';
import {
  ListMovementsQueryDto,
  StockAdjustDto,
  StockInDto,
  StockOutDto,
} from './dto/stock.dto';
import { StocksService } from './stocks.service';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StocksController {
  constructor(
    private readonly stocksService: StocksService,
    private readonly rolesService: RolesService,
  ) {}

  @Get('stock-movements')
  @RequirePermissions('stock.read')
  async list(@Query() query: ListMovementsQueryDto, @CurrentUser() user: User) {
    return this.stocksService.listMovements(query, await this.canSeeCost(user));
  }

  @Post('products/:id/stock/in')
  @RequirePermissions('stock.in')
  async stockIn(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StockInDto,
    @CurrentUser() user: User,
  ) {
    return this.stocksService.stockIn(id, dto, user.id, await this.canSeeCost(user));
  }

  @Post('products/:id/stock/out')
  @RequirePermissions('stock.out')
  async stockOut(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StockOutDto,
    @CurrentUser() user: User,
  ) {
    return this.stocksService.stockOut(id, dto, user.id, await this.canSeeCost(user));
  }

  @Post('products/:id/stock/adjust')
  @RequirePermissions('stock.adjust')
  async adjust(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StockAdjustDto,
    @CurrentUser() user: User,
  ) {
    return this.stocksService.adjust(id, dto, user.id, await this.canSeeCost(user));
  }

  private canSeeCost(user: User) {
    return this.rolesService.userHasPermission(user.id, 'products.read_cost');
  }
}

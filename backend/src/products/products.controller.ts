import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
  CreateProductDto,
  ListProductsQueryDto,
  SetProductStatusDto,
  UpdateProductDto,
} from './dto/product.dto';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly rolesService: RolesService,
  ) {}

  @Get()
  @RequirePermissions('products.read')
  async list(@Query() query: ListProductsQueryDto, @CurrentUser() user: User) {
    return this.productsService.list(query, await this.canSeeCost(user));
  }

  @Get(':id')
  @RequirePermissions('products.read')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.productsService.findOne(id, await this.canSeeCost(user));
  }

  @Post()
  @RequirePermissions('products.create')
  async create(@Body() dto: CreateProductDto, @CurrentUser() user: User) {
    return this.productsService.create(dto, user.id, await this.canSeeCost(user));
  }

  @Patch(':id')
  @RequirePermissions('products.update')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: User,
  ) {
    return this.productsService.update(id, dto, await this.canSeeCost(user));
  }

  @Patch(':id/status')
  @RequirePermissions('products.update')
  async setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetProductStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.productsService.setActive(
      id,
      dto.isActive,
      await this.canSeeCost(user),
    );
  }

  private canSeeCost(user: User) {
    return this.rolesService.userHasPermission(user.id, 'products.read_cost');
  }
}

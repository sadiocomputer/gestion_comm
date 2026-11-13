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
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { SearchListQueryDto } from '../common/dto/search-list-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { SetSupplierStatusDto } from './dto/set-supplier-status.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @RequirePermissions('suppliers.read')
  list(@Query() query: SearchListQueryDto) {
    return this.suppliersService.list(query);
  }

  @Get(':id')
  @RequirePermissions('suppliers.read')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.suppliersService.findOne(id);
  }

  @Post()
  @RequirePermissions('suppliers.create')
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('suppliers.update')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('suppliers.update')
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetSupplierStatusDto,
  ) {
    return this.suppliersService.setActive(id, dto.isActive);
  }
}

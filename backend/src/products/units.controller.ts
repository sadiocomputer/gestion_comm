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
import { UnitDto } from './dto/unit.dto';
import { UnitsService } from './units.service';

/** Liste des unités : mêmes droits que les catégories. */
@Controller('units')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Get()
  @RequirePermissions('products.read')
  list() {
    return this.unitsService.list();
  }

  @Post()
  @RequirePermissions('products.update')
  create(@Body() dto: UnitDto) {
    return this.unitsService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('products.update')
  rename(@Param('id', ParseIntPipe) id: number, @Body() dto: UnitDto) {
    return this.unitsService.rename(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions('products.update')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.unitsService.remove(id);
  }
}

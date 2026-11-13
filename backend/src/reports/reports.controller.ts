import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // Révèle marges et bénéfice : permission dédiée.
  @Get()
  @RequirePermissions('reports.read')
  build(@Query() query: ReportQueryDto) {
    return this.reportsService.build(query.from, query.to);
  }
}

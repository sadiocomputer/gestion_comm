import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

/**
 * Accessible à tout utilisateur connecté : le service ne calcule que les
 * blocs autorisés par ses permissions (les autres valent null).
 */
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  summary(@Query() query: DashboardQueryDto, @CurrentUser() user: User) {
    return this.dashboardService.summary(user.id, query.from, query.to);
  }
}

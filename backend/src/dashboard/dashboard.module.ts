import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { ReportsModule } from '../reports/reports.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

/** Statistiques de l'accueil. Pas de table : lecture seule des autres modules. */
@Module({
  imports: [PaymentsModule, ReportsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

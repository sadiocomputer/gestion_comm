import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

/** Rapports : aucune table, lecture seule des autres modules. */
@Module({
  imports: [PaymentsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService], // réutilisé par le tableau de bord (bénéfice, graphique)
})
export class ReportsModule {}

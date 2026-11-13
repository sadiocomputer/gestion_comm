import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientPayment } from './entities/client-payment.entity';
import { SupplierPayment } from './entities/supplier-payment.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { SupplierPaymentsController } from './supplier-payments.controller';
import { SupplierPaymentsService } from './supplier-payments.service';

@Module({
  imports: [TypeOrmModule.forFeature([ClientPayment, SupplierPayment])],
  controllers: [PaymentsController, SupplierPaymentsController],
  providers: [PaymentsService, SupplierPaymentsService],
  // PaymentsService : Ventes (paiement à la caisse) et tableau de bord.
  // SupplierPaymentsService : tableau de bord (total des dettes).
  exports: [PaymentsService, SupplierPaymentsService],
})
export class PaymentsModule {}

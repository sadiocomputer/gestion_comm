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
import { User } from '../users/entities/user.entity';
import { BalanceListQueryDto, CancelPaymentDto, PaymentDto } from './dto/payment.dto';
import { SupplierPaymentsService } from './supplier-payments.service';

/** Dettes et paiements fournisseurs. */
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SupplierPaymentsController {
  constructor(private readonly supplierPayments: SupplierPaymentsService) {}

  @Get('supplier-debts')
  @RequirePermissions('supplier_payments.read')
  debts(@Query() query: BalanceListQueryDto) {
    return this.supplierPayments.debts(query);
  }

  @Get('suppliers/:id/account')
  @RequirePermissions('supplier_payments.read')
  account(@Param('id', ParseIntPipe) id: number) {
    return this.supplierPayments.account(id);
  }

  @Get('suppliers/:id/purchases')
  @RequirePermissions('supplier_payments.read')
  purchases(@Param('id', ParseIntPipe) id: number, @Query() query: BalanceListQueryDto) {
    return this.supplierPayments.purchases(id, query);
  }

  @Get('suppliers/:id/payments')
  @RequirePermissions('supplier_payments.read')
  payments(@Param('id', ParseIntPipe) id: number, @Query() query: BalanceListQueryDto) {
    return this.supplierPayments.payments(id, query);
  }

  @Post('suppliers/:id/payments')
  @RequirePermissions('supplier_payments.create')
  pay(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PaymentDto,
    @CurrentUser() user: User,
  ) {
    return this.supplierPayments.pay(id, dto, user.id);
  }

  @Post('supplier-payments/:id/cancel')
  @RequirePermissions('payments.cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelPaymentDto,
    @CurrentUser() user: User,
  ) {
    return this.supplierPayments.cancel(id, dto.reason, user.id);
  }
}

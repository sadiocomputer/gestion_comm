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
import {
  BalanceListQueryDto,
  CancelPaymentDto,
  ListPaymentsQueryDto,
  PaymentDto,
} from './dto/payment.dto';
import { PaymentsService } from './payments.service';

/** Encaissements clients et créances. */
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('sales/:id/payments')
  @RequirePermissions('payments.create')
  addPayment(
    @Param('id', ParseIntPipe) saleId: number,
    @Body() dto: PaymentDto,
    @CurrentUser() user: User,
  ) {
    return this.paymentsService.addPayment(saleId, dto, user.id);
  }

  @Get('payments')
  @RequirePermissions('payments.read')
  list(@Query() query: ListPaymentsQueryDto) {
    return this.paymentsService.list(query);
  }

  @Post('payments/:id/cancel')
  @RequirePermissions('payments.cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelPaymentDto,
    @CurrentUser() user: User,
  ) {
    return this.paymentsService.cancel(id, dto.reason, user.id);
  }

  @Get('receivables')
  @RequirePermissions('payments.read')
  receivables(@Query() query: BalanceListQueryDto) {
    return this.paymentsService.receivables(query);
  }

  @Get('clients/:id/account')
  @RequirePermissions('payments.read')
  clientAccount(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: BalanceListQueryDto, // pagination des factures à encaisser
  ) {
    return this.paymentsService.clientAccount(id, query);
  }
}

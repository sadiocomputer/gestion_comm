import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { trim, trimOrNull } from '../../common/utils/transforms';
import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  type PaymentMethod,
  type PaymentStatus,
} from '../payment.constants';

const MAX_AMOUNT = 1_000_000_000_000;
const METHOD_MESSAGE = `Mode de paiement invalide (${PAYMENT_METHODS.join(', ')}).`;

/** Encaissement client ou paiement fournisseur. */
export class PaymentDto {
  @IsInt({ message: 'Le montant doit être un nombre entier (GNF).' })
  @Min(1, { message: 'Le montant doit être supérieur à 0.' })
  @Max(MAX_AMOUNT)
  amount: number;

  @IsIn(PAYMENT_METHODS, { message: METHOD_MESSAGE })
  method: PaymentMethod;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(100)
  reference?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(255)
  notes?: string | null;
}

/** Paiement saisi en même temps que la vente (0 = vente entièrement à crédit). */
export class SalePaymentDto {
  @IsInt({ message: 'Le montant reçu doit être un nombre entier (GNF).' })
  @Min(0)
  @Max(MAX_AMOUNT)
  amount: number;

  @IsIn(PAYMENT_METHODS, { message: METHOD_MESSAGE })
  method: PaymentMethod;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(100)
  reference?: string | null;
}

export class CancelPaymentDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: "Indique le motif de l'annulation." })
  @MaxLength(255)
  reason: string;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** GET /payments?clientId=&saleId=&method=&status=&from=&to=&page= */
export class ListPaymentsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clientId?: number;

  @IsOptional()
  @IsIn(PAYMENT_METHODS)
  method?: PaymentMethod;

  @IsOptional()
  @IsIn(PAYMENT_STATUSES)
  status?: PaymentStatus;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Date de début invalide (AAAA-MM-JJ).' })
  from?: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Date de fin invalide (AAAA-MM-JJ).' })
  to?: string;
}

/**
 * Simple pagination ?page=&limit= : GET /receivables, /supplier-debts,
 * /clients/:id/account, /suppliers/:id/purchases, /suppliers/:id/payments
 */
export class BalanceListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { trim, trimOrNull } from '../../common/utils/transforms';
import { SalePaymentDto } from '../../payments/dto/payment.dto';
import { SALE_STATUSES, type SaleStatus } from '../entities/sale.entity';

export const PAYMENT_STATES = ['UNPAID', 'PARTIAL', 'PAID'] as const;
export type PaymentState = (typeof PAYMENT_STATES)[number];

const MAX_AMOUNT = 1_000_000_000_000;

export class SaleItemDto {
  @IsInt()
  @Min(1)
  productId: number;

  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'Quantité invalide (3 décimales maximum).' },
  )
  @IsPositive({ message: 'La quantité doit être supérieure à 0.' })
  @Max(1_000_000_000)
  quantity: number;

  // Pris en compte seulement avec la permission sales.discount.
  @IsOptional()
  @IsInt({ message: 'Le prix doit être un nombre entier (GNF).' })
  @Min(0)
  @Max(MAX_AMOUNT)
  unitPrice?: number;
}

export class CreateSaleDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  clientId?: number | null;

  // @ValidateNested + @Type : chaque ligne est validée avec SaleItemDto.
  @IsArray()
  @ArrayMinSize(1, { message: 'Ajoute au moins un produit.' })
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @IsOptional()
  @IsInt({ message: 'La remise doit être un nombre entier (GNF).' })
  @Min(0)
  @Max(MAX_AMOUNT)
  discount?: number;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(255)
  notes?: string | null;

  // Montant reçu à la caisse (permission payments.create). Absent = non payée.
  @IsOptional()
  @ValidateNested()
  @Type(() => SalePaymentDto)
  payment?: SalePaymentDto;
}

export class CancelSaleDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: "Indique le motif de l'annulation." })
  @MaxLength(255)
  reason: string;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** GET /sales?search=&status=&clientId=&from=2026-11-01&to=2026-11-30&page= */
export class ListSalesQueryDto {
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
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(SALE_STATUSES)
  status?: SaleStatus;

  // Ventes validées seulement : non payées, partiellement payées, soldées.
  @IsOptional()
  @IsIn(PAYMENT_STATES)
  paymentStatus?: PaymentState;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  clientId?: number;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Date de début invalide (AAAA-MM-JJ).' })
  from?: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Date de fin invalide (AAAA-MM-JJ).' })
  to?: string;
}

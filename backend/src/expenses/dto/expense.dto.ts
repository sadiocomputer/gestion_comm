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
} from '../../payments/payment.constants';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreateExpenseDto {
  @IsInt({ message: 'Choisissez une catégorie.' })
  @Min(1)
  categoryId: number;

  @IsInt({ message: 'Le montant doit être un nombre entier (GNF).' })
  @Min(1, { message: 'Le montant doit être supérieur à 0.' })
  @Max(1_000_000_000_000)
  amount: number;

  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Décrivez la dépense en quelques mots.' })
  @MaxLength(255)
  description: string;

  // Absente = aujourd'hui.
  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Date invalide (AAAA-MM-JJ).' })
  expenseDate?: string;

  @IsOptional()
  @IsIn(PAYMENT_METHODS, { message: 'Mode de paiement invalide.' })
  method?: PaymentMethod;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(100)
  reference?: string | null;
}

export class CancelExpenseDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: "Indiquez le motif de l'annulation." })
  @MaxLength(255)
  reason: string;
}

/** GET /expenses?from=&to=&categoryId=&status=&page= */
export class ListExpensesQueryDto {
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
  @Matches(DATE_REGEX, { message: 'Date de début invalide (AAAA-MM-JJ).' })
  from?: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Date de fin invalide (AAAA-MM-JJ).' })
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  @IsOptional()
  @IsIn(PAYMENT_STATUSES)
  status?: PaymentStatus;
}

export class ExpenseCategoryDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères.' })
  @MaxLength(60)
  name: string;
}

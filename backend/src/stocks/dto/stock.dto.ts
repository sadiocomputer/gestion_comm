import { Transform, Type } from 'class-transformer';
import {
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
} from 'class-validator';
import { trim, trimOrNull } from '../../common/utils/transforms';
import { MOVEMENT_TYPES, type MovementType } from '../entities/stock-movement.entity';

const MAX_QTY = 1_000_000_000;
const QTY_OPTIONS = { maxDecimalPlaces: 3 };

/** Entrée de stock (réception de marchandise). */
export class StockInDto {
  @IsNumber(QTY_OPTIONS, { message: 'Quantité invalide (3 décimales maximum).' })
  @IsPositive({ message: 'La quantité doit être supérieure à 0.' })
  @Max(MAX_QTY)
  quantity: number;

  // Coût unitaire d'achat en GNF ; met à jour le prix d'achat du produit.
  @IsOptional()
  @IsInt({ message: 'Le coût doit être un nombre entier (GNF).' })
  @Min(0)
  @Max(1_000_000_000_000)
  unitCost?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  supplierId?: number;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(255)
  reason?: string | null;
}

/** Sortie hors vente (casse, perte, usage interne…) : motif obligatoire. */
export class StockOutDto {
  @IsNumber(QTY_OPTIONS, { message: 'Quantité invalide (3 décimales maximum).' })
  @IsPositive({ message: 'La quantité doit être supérieure à 0.' })
  @Max(MAX_QTY)
  quantity: number;

  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Indique le motif de la sortie.' })
  @MaxLength(255)
  reason: string;
}

/** Inventaire : on saisit la quantité réellement comptée. */
export class StockAdjustDto {
  @IsNumber(QTY_OPTIONS, { message: 'Quantité invalide (3 décimales maximum).' })
  @Min(0, { message: 'La quantité comptée ne peut pas être négative.' })
  @Max(MAX_QTY)
  countedQuantity: number;

  @Transform(trim)
  @IsString()
  @MinLength(2, { message: "Indique le motif de l'ajustement." })
  @MaxLength(255)
  reason: string;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** GET /stock-movements?productId=&type=&from=&to=&page=&limit= (dates incluses) */
export class ListMovementsQueryDto {
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
  productId?: number;

  @IsOptional()
  @IsIn(MOVEMENT_TYPES)
  type?: MovementType;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Date de début invalide (AAAA-MM-JJ).' })
  from?: string;

  @IsOptional()
  @Matches(DATE_REGEX, { message: 'Date de fin invalide (AAAA-MM-JJ).' })
  to?: string;
}

import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { SearchListQueryDto } from '../../common/dto/search-list-query.dto';
import { trim, trimOrNull } from '../../common/utils/transforms';

const MAX_PRICE = 1_000_000_000_000; // 1 000 milliards GNF
const MAX_QTY = 1_000_000_000;
const QTY_OPTIONS = { maxDecimalPlaces: 3 };

export class CreateProductDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères.' })
  @MaxLength(150)
  name: string;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(50)
  sku?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  unit?: string;

  @IsOptional()
  @IsInt({ message: "Le prix d'achat doit être un nombre entier (GNF)." })
  @Min(0)
  @Max(MAX_PRICE)
  purchasePrice?: number;

  @IsInt({ message: 'Le prix de vente doit être un nombre entier (GNF).' })
  @Min(0)
  @Max(MAX_PRICE)
  salePrice: number;

  @IsOptional()
  @IsNumber(QTY_OPTIONS, { message: 'Seuil invalide (3 décimales maximum).' })
  @Min(0)
  @Max(MAX_QTY)
  minStock?: number;

  // Enregistré comme une entrée "Stock initial" (traçabilité).
  @IsOptional()
  @IsNumber(QTY_OPTIONS, { message: 'Quantité invalide (3 décimales maximum).' })
  @Min(0)
  @Max(MAX_QTY)
  initialQuantity?: number;
}

/** Pas de "quantity" ici : le stock ne change que par des mouvements. */
export class UpdateProductDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères.' })
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(50)
  sku?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  unit?: string;

  @IsOptional()
  @IsInt({ message: "Le prix d'achat doit être un nombre entier (GNF)." })
  @Min(0)
  @Max(MAX_PRICE)
  purchasePrice?: number;

  @IsOptional()
  @IsInt({ message: 'Le prix de vente doit être un nombre entier (GNF).' })
  @Min(0)
  @Max(MAX_PRICE)
  salePrice?: number;

  @IsOptional()
  @IsNumber(QTY_OPTIONS, { message: 'Seuil invalide (3 décimales maximum).' })
  @Min(0)
  @Max(MAX_QTY)
  minStock?: number;
}

export class SetProductStatusDto {
  @IsBoolean({ message: 'isActive doit valoir true ou false.' })
  isActive: boolean;
}

/** GET /products?search=&status=&categoryId=&lowStock=true&page= */
export class ListProductsQueryDto extends SearchListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  // Dans l'URL, tout est texte : "true" -> true.
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  @IsBoolean()
  lowStock?: boolean;
}

import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IsAnyPhone } from '../../common/decorators/is-any-phone.decorator';
import { trim, trimOrNull } from '../../common/utils/transforms';

/** Champs facultatifs : on n'envoie que ce qui change ; null efface. */
export class UpdateSupplierDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères.' })
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(120)
  contactName?: string | null;

  @IsOptional()
  @IsAnyPhone()
  phone?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(255)
  address?: string | null;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

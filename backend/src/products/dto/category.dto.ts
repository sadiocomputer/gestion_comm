import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { trim, trimOrNull } from '../../common/utils/transforms';

export class CreateCategoryDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères.' })
  @MaxLength(80)
  name: string;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(255)
  description?: string | null;
}

export class UpdateCategoryDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères.' })
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(255)
  description?: string | null;
}

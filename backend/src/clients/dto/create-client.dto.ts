import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IsGuineaPhone } from '../../common/decorators/is-guinea-phone.decorator';
import { trim, trimOrNull } from '../../common/utils/transforms';

export class CreateClientDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères.' })
  @MaxLength(120)
  name: string;

  // null ou absent = pas de téléphone.
  @IsOptional()
  @IsGuineaPhone()
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

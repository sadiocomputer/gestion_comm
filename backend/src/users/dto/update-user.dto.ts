import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IsGuineaPhone } from '../../common/decorators/is-guinea-phone.decorator';

/** Champs facultatifs : on n'envoie que ce qui change. */
export class UpdateUserDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères.' })
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsGuineaPhone()
  phone?: string;
}

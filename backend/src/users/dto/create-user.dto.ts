import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères.' })
  @MaxLength(120)
  name: string;

  @IsString()
  @Matches(/^[0-9+\s]{8,20}$/, {
    message: 'Numéro de téléphone invalide.',
  })
  phone: string;

  @IsString()
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères.',
  })
  @MaxLength(128)
  password: string;
}

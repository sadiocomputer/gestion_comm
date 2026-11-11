import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @Matches(/^[0-9+\s]{8,20}$/, {
    message: 'Numéro de téléphone invalide.',
  })
  phone: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password: string;
}

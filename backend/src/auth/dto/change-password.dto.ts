import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'Indique le mot de passe actuel.' })
  @MaxLength(128)
  currentPassword: string;

  @IsString()
  @MinLength(8, {
    message: 'Le nouveau mot de passe doit contenir au moins 8 caractères.',
  })
  @MaxLength(128)
  newPassword: string;
}

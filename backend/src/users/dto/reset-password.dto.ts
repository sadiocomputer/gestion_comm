import { IsString, MaxLength, MinLength } from 'class-validator';

/** Réinitialisation par un administrateur (pas besoin de l'ancien mot de passe). */
export class ResetPasswordDto {
  @IsString()
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères.',
  })
  @MaxLength(128)
  newPassword: string;
}

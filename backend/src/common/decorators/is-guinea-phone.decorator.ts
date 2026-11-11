import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';
import { GUINEA_PHONE_REGEX, normalizeGuineaPhone } from '../utils/phone';

/**
 * À placer sur un champ "phone" de DTO.
 * 1. @Transform normalise la saisie (ValidationPipe a transform: true).
 * 2. @Matches vérifie le résultat. Si la normalisation a échoué, la valeur
 *    d'origine est conservée et la validation la rejette.
 */
export function IsGuineaPhone() {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? (normalizeGuineaPhone(value) ?? value) : value,
    ),
    IsString(),
    Matches(GUINEA_PHONE_REGEX, {
      message: 'Numéro de téléphone invalide (ex. 620 00 00 00).',
    }),
  );
}

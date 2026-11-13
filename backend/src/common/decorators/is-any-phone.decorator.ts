import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';
import { ANY_PHONE_REGEX, normalizeAnyPhone } from '../utils/phone';

/** Comme @IsGuineaPhone, mais accepte aussi les numéros étrangers. */
export function IsAnyPhone() {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? (normalizeAnyPhone(value) ?? value) : value,
    ),
    IsString(),
    Matches(ANY_PHONE_REGEX, {
      message:
        'Numéro invalide (ex. 620 00 00 00 ou +86 138 0000 0000 pour l’étranger).',
    }),
  );
}

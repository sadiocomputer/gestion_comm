/** Numéro guinéen au format local : 9 chiffres, 6xx (mobile) ou 3xx (fixe). */
export const GUINEA_PHONE_REGEX = /^[36]\d{8}$/;

/**
 * Ramène toutes les écritures d'un même numéro au format local.
 * "+224 620 00 00 00", "00224620000000", "620-00-00-00" -> "620000000".
 * Renvoie null si le numéro n'est pas un numéro guinéen valide.
 */
export function normalizeGuineaPhone(value: string): string | null {
  let digits = value.replace(/[\s.\-()]/g, '');

  if (digits.startsWith('+224')) {
    digits = digits.slice(4);
  } else if (digits.startsWith('00224')) {
    digits = digits.slice(5);
  } else if (/^224\d{9}$/.test(digits)) {
    digits = digits.slice(3);
  }

  return GUINEA_PHONE_REGEX.test(digits) ? digits : null;
}

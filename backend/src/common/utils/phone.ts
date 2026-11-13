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

/** Numéro guinéen (9 chiffres) OU international (+ suivi de 8 à 15 chiffres). */
export const ANY_PHONE_REGEX = /^([36]\d{8}|\+\d{8,15})$/;

/**
 * Pour les fournisseurs, qui peuvent être à l'étranger.
 * Un numéro guinéen est ramené au format local ; un numéro étranger est
 * gardé au format international : "0086 138 0000 0000" -> "+8613800000000".
 */
export function normalizeAnyPhone(value: string): string | null {
  const guinea = normalizeGuineaPhone(value);
  if (guinea) return guinea;

  let compact = value.replace(/[\s.\-()]/g, '');
  if (compact.startsWith('00')) compact = `+${compact.slice(2)}`;
  return ANY_PHONE_REGEX.test(compact) ? compact : null;
}

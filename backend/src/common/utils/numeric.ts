import { ValueTransformer } from 'typeorm';

/**
 * MySQL renvoie les colonnes BIGINT et DECIMAL sous forme de texte
 * ("350000", "12.500") pour ne pas perdre de précision. On les convertit
 * en nombres JavaScript (sans risque jusqu'à 9 millions de milliards).
 */
export const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

/**
 * Colonne DATE (sans heure) : mysql2 la renvoie en objet Date à minuit UTC.
 * On la manipule en texte "AAAA-MM-JJ", plus simple et sans piège de fuseau.
 */
export const dateOnlyTransformer: ValueTransformer = {
  to: (value: string | null | undefined) => value,
  from: (value: Date | string | null) =>
    value instanceof Date ? value.toISOString().slice(0, 10) : value,
};

/**
 * Arrondit une quantité à 3 décimales. En JavaScript, 0.1 + 0.2 donne
 * 0.30000000000000004 : on arrondit après chaque calcul de stock.
 */
export function roundQty(value: number): number {
  return Math.round(value * 1000) / 1000;
}

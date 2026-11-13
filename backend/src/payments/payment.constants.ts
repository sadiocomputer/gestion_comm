/** Modes de paiement courants en Guinée. */
export const PAYMENT_METHODS = [
  'CASH',
  'ORANGE_MONEY',
  'MTN_MOMO',
  'BANK',
  'OTHER',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['VALID', 'CANCELLED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

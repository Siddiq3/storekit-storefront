import { formatMoney } from '@storekit/shared';

/** Prices are integer paise everywhere; this is the one place they become text. */
export const money = (paise) => formatMoney(Number(paise) || 0);

/** A whole-number quantity within what the API accepts (1–99). */
export const clampQuantity = (value) => {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return 1;
  return Math.min(99, Math.max(1, n));
};

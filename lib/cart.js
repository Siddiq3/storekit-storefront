import { clampQuantity } from './money.js';

/**
 * The cart, as plain data and pure functions. A line is `{ productId, variantId, quantity }` plus a small snapshot
 * (`name`, `imageUrl`, `slug`, `unitPrice`, `variantLabel`) used only to draw the cart before the server has answered.
 * Nothing in a cart is a price the shopper is charged: the API quotes every total, and the order is created with the
 * total the shopper saw so that a stale price is refused, never charged.
 */

export const MAX_LINES = 50;

export const lineKey = (line) => `${line.productId}:${line.variantId ?? ''}`;

const same = (a, b) => lineKey(a) === lineKey(b);

/** Adds a line, or raises the quantity of the same product and variant. */
export const addLine = (lines, incoming) => {
  const line = { ...incoming, variantId: incoming.variantId ?? null, quantity: clampQuantity(incoming.quantity ?? 1) };
  const existing = lines.find((l) => same(l, line));
  if (existing) {
    return lines.map((l) => (same(l, line) ? { ...l, ...line, quantity: clampQuantity(l.quantity + line.quantity) } : l));
  }
  return lines.length >= MAX_LINES ? lines : [...lines, line];
};

export const setQuantity = (lines, key, quantity) =>
  lines.map((l) => (lineKey(l) === key ? { ...l, quantity: clampQuantity(quantity) } : l));

export const removeLine = (lines, key) => lines.filter((l) => lineKey(l) !== key);

export const itemCount = (lines) => lines.reduce((sum, l) => sum + l.quantity, 0);

/** What is sent to the API: ids and quantities only. */
export const toQuoteLines = (lines) =>
  lines.map((l) => ({ productId: l.productId, ...(l.variantId ? { variantId: l.variantId } : {}), quantity: l.quantity }));

/** A stored cart is untrusted input like any other: keep only well-formed lines. */
export const sanitize = (value) => {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    if (typeof raw.productId !== 'string' || !/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(raw.productId)) continue;
    if (raw.variantId != null && (typeof raw.variantId !== 'string' || !/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(raw.variantId))) continue;
    const line = {
      productId: raw.productId,
      variantId: raw.variantId ?? null,
      quantity: clampQuantity(raw.quantity),
      name: typeof raw.name === 'string' ? raw.name.slice(0, 200) : '',
      slug: typeof raw.slug === 'string' ? raw.slug.slice(0, 120) : '',
      imageUrl: typeof raw.imageUrl === 'string' && raw.imageUrl.startsWith('https://') ? raw.imageUrl : undefined,
      unitPrice: Number.isInteger(raw.unitPrice) ? raw.unitPrice : 0,
      variantLabel: typeof raw.variantLabel === 'string' ? raw.variantLabel.slice(0, 120) : undefined,
    };
    if (!out.some((l) => same(l, line))) out.push(line);
    if (out.length >= MAX_LINES) break;
  }
  return out;
};

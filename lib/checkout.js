import { addressSchema } from '@storekit/validation';

/**
 * Checkout, as pure functions. The address is validated with the API's own `addressSchema` — the same rules, the
 * same messages — so a shopper is told about a mistake before anything is sent; the server checks it again.
 */

export const ADDRESS_FIELDS = [
  'fullName', 'mobile', 'houseNo', 'street', 'area', 'landmark', 'city', 'district', 'state', 'pincode', 'instructions',
];

export const emptyAddress = () => Object.fromEntries(ADDRESS_FIELDS.map((f) => [f, '']));

/**
 * @param {Record<string,string>} values  what the form holds
 * @returns {{ ok: true, address: object } | { ok: false, errors: Record<string,string> }}
 */
export const validateAddress = (values) => {
  // Optional fields left empty are left out, not sent as "".
  const input = {};
  for (const field of ADDRESS_FIELDS) {
    const value = String(values[field] ?? '').trim();
    if (value !== '' || !['landmark', 'instructions'].includes(field)) input[field] = value;
  }
  const parsed = addressSchema.safeParse(input);
  if (parsed.success) return { ok: true, address: parsed.data };

  const errors = {};
  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0] ?? '');
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { ok: false, errors };
};

export const PAYMENT_LABELS = {
  COD: { title: 'Cash on delivery', hint: 'Pay in cash when your order arrives.' },
  UPI_MANUAL: { title: 'Pay by UPI', hint: 'You will see the shop\'s UPI details after placing the order, then send the payment reference.' },
};

/** What is sent to place an order. `expectedTotal` is the total the shopper was shown; the API refuses a different one. */
export const orderBody = ({ lines, address, couponCode, paymentMethod, expectedTotal }) => ({
  lines,
  address,
  ...(couponCode ? { couponCode } : {}),
  paymentMethod,
  expectedTotal,
});

const KEY = 'storekit.checkout-attempt.v1';

const randomKey = () => `sk_${crypto.randomUUID().replace(/-/g, '')}`;

/**
 * One idempotency key per checkout attempt. Sending the same order again (a retry after a dropped connection, a double
 * tap) reuses the key, so the API returns the first result instead of creating a second order; a changed order gets a
 * new key, because the API refuses one key with different contents.
 */
export const idempotencyKeyFor = (body, storage = globalThis.sessionStorage) => {
  const fingerprint = JSON.stringify(body);
  try {
    const saved = JSON.parse(storage.getItem(KEY) ?? 'null');
    if (saved?.fingerprint === fingerprint && typeof saved.key === 'string') return saved.key;
    const key = randomKey();
    storage.setItem(KEY, JSON.stringify({ fingerprint, key }));
    return key;
  } catch {
    return randomKey();
  }
};

export const clearIdempotencyKey = (storage = globalThis.sessionStorage) => {
  try { storage.removeItem(KEY); } catch { /* nothing stored */ }
};

const UPI_KEY = 'storekit.upi.v1';

/** The UPI details come back once, when the order is created; they are kept for this tab so the order page can show them. */
export const saveUpi = (token, upi, storage = globalThis.sessionStorage) => {
  try { storage.setItem(UPI_KEY, JSON.stringify({ token, upi })); } catch { /* the order page then asks them to contact the shop */ }
};

export const loadUpi = (token, storage = globalThis.sessionStorage) => {
  try {
    const saved = JSON.parse(storage.getItem(UPI_KEY) ?? 'null');
    return saved?.token === token ? saved.upi : null;
  } catch {
    return null;
  }
};

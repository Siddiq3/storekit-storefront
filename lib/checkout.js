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

// `crypto.randomUUID` exists only in secure contexts (https, localhost) and newer browsers; `getRandomValues` works everywhere.
const randomKey = () => {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return `sk_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
};

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

const ADDRESS_KEY = 'storekit.address.v1';
// What is worth remembering about a person: not a note that belonged to one order.
const REMEMBERED = ADDRESS_FIELDS.filter((f) => f !== 'instructions');

/**
 * The delivery details a shopper chose to keep, for their next visit. They live only in this browser, on this store's
 * own address (localStorage is per origin, so one shop never sees another's), and are never sent anywhere until the
 * shopper places an order. There is no account: this is all the "login" there is.
 */
export const saveAddress = (values, storage = globalThis.localStorage) => {
  const kept = {};
  for (const field of REMEMBERED) kept[field] = String(values[field] ?? '').trim().slice(0, 120);
  try { storage.setItem(ADDRESS_KEY, JSON.stringify(kept)); return true; } catch { return false; }
};

/** Saved details, or null. Anything that is not a plain string field is dropped: stored data is untrusted like any other. */
export const loadAddress = (storage = globalThis.localStorage) => {
  try {
    const saved = JSON.parse(storage.getItem(ADDRESS_KEY) ?? 'null');
    if (!saved || typeof saved !== 'object') return null;
    const values = emptyAddress();
    let any = false;
    for (const field of REMEMBERED) {
      if (typeof saved[field] === 'string') { values[field] = saved[field].slice(0, 120); any = any || values[field] !== ''; }
    }
    return any ? values : null;
  } catch {
    return null;
  }
};

export const clearAddress = (storage = globalThis.localStorage) => {
  try { storage.removeItem(ADDRESS_KEY); } catch { /* nothing stored */ }
};

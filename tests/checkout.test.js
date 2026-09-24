import { describe, expect, it } from 'vitest';
import { clearAddress, loadAddress, saveAddress, clearIdempotencyKey, emptyAddress, idempotencyKeyFor, loadUpi, orderBody, saveUpi, validateAddress } from '@/lib/checkout.js';

const valid = { fullName: 'Asha Rao', mobile: '98765 43210', houseNo: '12', street: 'MG Road', area: 'Indiranagar', landmark: '', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', pincode: '560038', instructions: '' };

const memory = () => {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: (k) => data.delete(k) };
};

describe('checkout validation', () => {
  it('accepts a complete address and normalises the mobile number', () => {
    const result = validateAddress(valid);
    expect(result.ok).toBe(true);
    expect(result.address.mobile).toBe('9876543210');
  });

  it('leaves out optional fields that are empty instead of sending ""', () => {
    const { address } = validateAddress(valid);
    expect(address).not.toHaveProperty('landmark');
    expect(address).not.toHaveProperty('instructions');
  });

  it('keeps delivery instructions when given', () => {
    expect(validateAddress({ ...valid, instructions: 'Leave with the guard' }).address.instructions).toBe('Leave with the guard');
  });

  it('says which fields need attention, in the API\'s own words', () => {
    const result = validateAddress(emptyAddress());
    expect(result.ok).toBe(false);
    expect(Object.keys(result.errors)).toEqual(expect.arrayContaining(['fullName', 'mobile', 'houseNo', 'street', 'area', 'city', 'district', 'state', 'pincode']));
    expect(result.errors).not.toHaveProperty('landmark');
    expect(result.errors).not.toHaveProperty('instructions');
  });

  it.each([
    ['mobile', '12345', /10-digit/],
    ['pincode', '0123', /6-digit/],
    ['pincode', '56003A', /6-digit/],
    ['fullName', 'A', /./],
    ['fullName', '<script>', /./],
  ])('rejects a bad %s (%s)', (field, value, message) => {
    const result = validateAddress({ ...valid, [field]: value });
    expect(result.ok).toBe(false);
    expect(result.errors[field]).toMatch(message);
  });
});

describe('order body', () => {
  const lines = [{ productId: 'A', quantity: 1 }];
  const address = { fullName: 'A' };

  it('builds a COD order with the total the shopper saw', () => {
    expect(orderBody({ lines, address, paymentMethod: 'COD', expectedTotal: 259800 })).toEqual({ lines, address, paymentMethod: 'COD', expectedTotal: 259800 });
  });

  it('builds a UPI_MANUAL order, with a coupon when there is one', () => {
    expect(orderBody({ lines, address, paymentMethod: 'UPI_MANUAL', expectedTotal: 1, couponCode: 'SAVE10' })).toMatchObject({ paymentMethod: 'UPI_MANUAL', couponCode: 'SAVE10' });
  });

  it('has no business, store or price field to tamper with', () => {
    const body = orderBody({ lines, address, paymentMethod: 'COD', expectedTotal: 1 });
    expect(Object.keys(body).sort()).toEqual(['address', 'expectedTotal', 'lines', 'paymentMethod']);
  });
});

describe('idempotency', () => {
  it('reuses the key for the same order, so a retry cannot become a second order', () => {
    const storage = memory();
    const body = { a: 1 };
    expect(idempotencyKeyFor(body, storage)).toBe(idempotencyKeyFor(body, storage));
  });

  it('uses a new key when the order changes: the API refuses one key with different contents', () => {
    const storage = memory();
    expect(idempotencyKeyFor({ a: 1 }, storage)).not.toBe(idempotencyKeyFor({ a: 2 }, storage));
  });

  it('is a key the API accepts, and is forgotten after success', () => {
    const storage = memory();
    const key = idempotencyKeyFor({ a: 1 }, storage);
    expect(key).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
    clearIdempotencyKey(storage);
    expect(idempotencyKeyFor({ a: 1 }, storage)).not.toBe(key);
  });

  it('does not need crypto.randomUUID, which plain-http and older browsers lack', () => {
    const real = globalThis.crypto;
    Object.defineProperty(globalThis, 'crypto', { value: { getRandomValues: real.getRandomValues.bind(real) }, configurable: true });
    try {
      const key = idempotencyKeyFor({ a: 9 }, memory());
      expect(key).toMatch(/^sk_[0-9a-f]{32}$/);
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: real, configurable: true });
    }
  });

  it('still works when storage is unavailable', () => {
    expect(idempotencyKeyFor({ a: 1 }, { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } })).toMatch(/^sk_/);
  });
});

describe('UPI details for the order page', () => {
  it('are kept for the order they belong to, and only that one', () => {
    const storage = memory();
    saveUpi('token-1', { upiId: 'a@upi' }, storage);
    expect(loadUpi('token-1', storage)).toEqual({ upiId: 'a@upi' });
    expect(loadUpi('token-2', storage)).toBeNull();
  });
});

describe('remembering a returning shopper (no account)', () => {
  const values = { ...emptyAddress(), fullName: 'Asha Rao', mobile: '9876543210', houseNo: '12', street: 'MG Road', area: 'Indiranagar', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', pincode: '560038', instructions: 'Leave with the guard' };

  it('brings the details back on the next visit', () => {
    const storage = memory();
    expect(loadAddress(storage)).toBeNull();
    saveAddress(values, storage);
    expect(loadAddress(storage)).toMatchObject({ fullName: 'Asha Rao', mobile: '9876543210', pincode: '560038', city: 'Bengaluru' });
  });

  it('does not keep a note that belonged to one order', () => {
    const storage = memory();
    saveAddress(values, storage);
    expect(loadAddress(storage).instructions).toBe('');
  });

  it('forgets everything when asked', () => {
    const storage = memory();
    saveAddress(values, storage);
    clearAddress(storage);
    expect(loadAddress(storage)).toBeNull();
  });

  it('treats stored data as untrusted: only plain, bounded text fields come back', () => {
    const storage = memory();
    storage.setItem('storekit.address.v1', JSON.stringify({ fullName: 'A'.repeat(500), mobile: 42, city: { x: 1 }, businessId: 'X', __proto__: { y: 1 }, pincode: '560038' }));
    const loaded = loadAddress(storage);
    expect(loaded.fullName).toHaveLength(120);
    expect(loaded.mobile).toBe('');
    expect(loaded.city).toBe('');
    expect(loaded).not.toHaveProperty('businessId');
    storage.setItem('storekit.address.v1', 'not json');
    expect(loadAddress(storage)).toBeNull();
    storage.setItem('storekit.address.v1', JSON.stringify({ nothing: 'useful' }));
    expect(loadAddress(storage)).toBeNull();
  });

  it('still works when storage is blocked', () => {
    const blocked = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
    expect(loadAddress(blocked)).toBeNull();
    expect(saveAddress(values, blocked)).toBe(false);
    expect(() => clearAddress(blocked)).not.toThrow();
  });
});

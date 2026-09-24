import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearStoreCache } from '@/lib/store-data.js';
import { fail, mockApi, ok, ULID } from './helpers.js';

let incoming = new Headers();
vi.mock('next/headers', () => ({ headers: async () => incoming }));

const { POST: quote } = await import('../app/api/quote/route.js');
const { POST: order } = await import('../app/api/orders/route.js');
const { POST: upi } = await import('../app/api/orders/upi/route.js');

const HOST = 'asha.storekit.site';
const address = { fullName: 'Asha Rao', mobile: '9876543210', houseNo: '12', street: 'MG Road', area: 'Indiranagar', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', pincode: '560038' };
const lines = [{ productId: ULID, quantity: 2 }];
const TOKEN = '01H8XGJWBWBAQ4Z4RZ4ZQ1ZQ1Z.' + 'a'.repeat(43);

const post = (handler, body, { origin = `https://${HOST}`, idem, host = HOST, extra = {} } = {}) => {
  const headers = { host, 'content-type': 'application/json', ...(origin ? { origin } : {}), ...(idem ? { 'x-idempotency-key': idem } : {}), ...extra };
  return handler(new Request(`https://${host}/api/x`, { method: 'POST', headers, body: JSON.stringify(body) }));
};
const body = async (response) => response.json();

describe('storefront API routes (what the browser is allowed to call)', () => {
  beforeEach(() => {
    clearStoreCache();
    incoming = new Headers({ 'x-storekit-slug': 'asha', 'x-storekit-host': HOST, 'x-storekit-canonical-host': HOST, 'cf-connecting-ip': '203.0.113.7' });
  });

  describe('which store', () => {
    it('is the one the middleware resolved, never anything in the body', async () => {
      const calls = mockApi({ 'POST /public/stores/asha/cart/quote': ok({ total: 1 }) });
      const response = await post(quote, { lines });
      expect(response.status).toBe(200);
      expect(calls[0].url.pathname).toBe('/v1/public/stores/asha/cart/quote');
    });

    it('a businessId, slug or storeId in the body is refused, not forwarded', async () => {
      const calls = mockApi({ 'POST /public/stores/asha/cart/quote': ok({}) });
      for (const extra of [{ businessId: '01HZZZ' }, { slug: 'demo' }, { storeId: 'x' }, { host: 'demo.storekit.site' }]) {
        const response = await post(quote, { lines, ...extra });
        expect(response.status, JSON.stringify(extra)).toBe(400);
      }
      expect(calls).toHaveLength(0);
    });

    it('with no resolved store there is nothing to call', async () => {
      incoming = new Headers();
      const calls = mockApi({});
      expect((await post(quote, { lines })).status).toBe(404);
      expect(calls).toHaveLength(0);
    });

    it('a slug header that is not a slug is not used', async () => {
      incoming = new Headers({ 'x-storekit-slug': '../admin' });
      const calls = mockApi({});
      expect((await post(quote, { lines })).status).toBe(404);
      expect(calls).toHaveLength(0);
    });
  });

  describe('who may call', () => {
    it('refuses another site\'s page, a missing Origin, and an Origin for a different host', async () => {
      const calls = mockApi({ 'POST /public/stores/asha/cart/quote': ok({}) });
      for (const origin of ['https://evil.example', 'https://demo.storekit.site', null, 'null', 'not a url']) {
        expect((await post(quote, { lines }, { origin })).status, String(origin)).toBe(403);
      }
      expect(calls).toHaveLength(0);
    });

    it('needs JSON, and a bounded body', async () => {
      mockApi({ 'POST /public/stores/asha/cart/quote': ok({}) });
      const wrong = await quote(new Request(`https://${HOST}/api/quote`, { method: 'POST', headers: { host: HOST, origin: `https://${HOST}`, 'content-type': 'text/plain' }, body: 'x' }));
      expect(wrong.status).toBe(415);
      const big = await quote(new Request(`https://${HOST}/api/quote`, { method: 'POST', headers: { host: HOST, origin: `https://${HOST}`, 'content-type': 'application/json' }, body: JSON.stringify({ lines, pad: 'x'.repeat(70_000) }) }));
      expect(big.status).toBe(413);
    });
  });

  describe('forwarding', () => {
    it('sends the shopper address and the secret to the API; the browser response contains neither', async () => {
      const calls = mockApi({ 'POST /public/stores/asha/cart/quote': ok({ total: 1 }) });
      const response = await post(quote, { lines });
      expect(calls[0].headers['cf-connecting-ip']).toBe('203.0.113.7');
      expect(calls[0].headers['x-storekit-edge-secret']).toBe(process.env.EDGE_SHARED_SECRET);
      const text = JSON.stringify(await body(response)) + [...response.headers].join();
      expect(text).not.toContain(process.env.EDGE_SHARED_SECRET);
      expect(text).not.toContain('api.test.local');
    });

    it('an X-Forwarded-For from the visitor is not what gets forwarded', async () => {
      incoming = new Headers({ 'x-storekit-slug': 'asha', 'x-forwarded-for': '198.51.100.99' });
      const calls = mockApi({ 'POST /public/stores/asha/cart/quote': ok({}) });
      await post(quote, { lines });
      expect(calls[0].headers['cf-connecting-ip']).toBeUndefined();
    });
  });

  describe('placing an order', () => {
    const good = (over = {}) => ({ lines, address, paymentMethod: 'COD', expectedTotal: 259800, ...over });
    const confirmation = { orderId: 'INTERNAL-ID', orderNumber: 'ORD-000001', status: 'NEW', paymentMethod: 'COD', paymentStatus: 'NOT_REQUIRED', totals: { total: 259800 }, trackingToken: TOKEN };

    it('creates a COD order, passes the idempotency key on, and never returns the internal id', async () => {
      const calls = mockApi({ 'POST /public/stores/asha/orders': ok(confirmation) });
      const response = await post(order, good(), { idem: 'sk_abcdefgh12345678' });
      const data = await body(response);
      expect(response.status).toBe(201);
      expect(data).toMatchObject({ orderNumber: 'ORD-000001', trackingToken: TOKEN });
      expect(data).not.toHaveProperty('orderId');
      expect(calls[0].headers['x-idempotency-key']).toBe('sk_abcdefgh12345678');
      expect(JSON.parse(calls[0].init.body)).toMatchObject({ paymentMethod: 'COD', expectedTotal: 259800 });
    });

    it('creates a UPI_MANUAL order and returns the UPI details for the shopper to pay', async () => {
      mockApi({ 'POST /public/stores/asha/orders': ok({ ...confirmation, paymentMethod: 'UPI_MANUAL', upi: { upiId: 'asha@upi', amount: 259800, deepLink: 'upi://pay?pa=asha@upi' } }) });
      const data = await body(await post(order, good({ paymentMethod: 'UPI_MANUAL' }), { idem: 'sk_abcdefgh12345678' }));
      expect(data.upi).toMatchObject({ upiId: 'asha@upi' });
    });

    it('has no other payment method: card and online payment are refused before the API', async () => {
      const calls = mockApi({ 'POST /public/stores/asha/orders': ok(confirmation) });
      for (const paymentMethod of ['CARD', 'ONLINE', 'CASHFREE', 'cod', '']) {
        expect((await post(order, good({ paymentMethod }), { idem: 'sk_abcdefgh12345678' })).status, paymentMethod).toBe(400);
      }
      expect(calls).toHaveLength(0);
    });

    it('requires an idempotency key of the right shape', async () => {
      const calls = mockApi({ 'POST /public/stores/asha/orders': ok(confirmation) });
      for (const idem of [undefined, 'short', 'has spaces in it!', 'x'.repeat(200)]) {
        expect((await post(order, good(), { idem })).status, String(idem)).toBe(400);
      }
      expect(calls).toHaveLength(0);
    });

    it('validates the address before sending, with the same rules as the API', async () => {
      const calls = mockApi({ 'POST /public/stores/asha/orders': ok(confirmation) });
      const response = await post(order, good({ address: { ...address, pincode: '12', mobile: '123' } }), { idem: 'sk_abcdefgh12345678' });
      const data = await body(response);
      expect(response.status).toBe(400);
      expect(data.error.details.map((d) => d.path)).toEqual(expect.arrayContaining(['address.pincode', 'address.mobile']));
      expect(calls).toHaveLength(0);
    });

    it('a failed order is a curated error: the API\'s shopper message, and nothing else', async () => {
      mockApi({ 'POST /public/stores/asha/orders': fail(409, 'TOTAL_MISMATCH', 'The total changed since you looked') });
      const response = await post(order, good(), { idem: 'sk_abcdefgh12345678' });
      expect(response.status).toBe(409);
      expect(await body(response)).toEqual({ error: { code: 'TOTAL_MISMATCH', message: 'The total changed since you looked' } });
    });

    it('when the API is down the shopper gets a generic message, never a backend one', async () => {
      mockApi({ 'POST /public/stores/asha/orders': fail(500, 'INTERNAL_ERROR', 'ReferenceError: table storekit-prod-main at /var/task/x.js') });
      const response = await post(order, good(), { idem: 'sk_abcdefgh12345678' });
      const text = JSON.stringify(await body(response));
      expect(response.status).toBe(503);
      expect(text).not.toMatch(/ReferenceError|storekit-prod|\/var\/task/);
    });

    it('a rate-limited shopper is told to wait', async () => {
      mockApi({ 'POST /public/stores/asha/orders': fail(429, 'RATE_LIMITED') });
      const response = await post(order, good(), { idem: 'sk_abcdefgh12345678' });
      expect(response.status).toBe(429);
    });
  });

  describe('UPI payment reference', () => {
    it('finds the order by its token on the server, submits, and hides the internal id', async () => {
      const calls = mockApi({
        'POST /public/stores/asha/orders/lookup': ok({ orderId: 'INTERNAL-ID', orderNumber: 'ORD-1' }),
        'POST /public/orders/INTERNAL-ID/upi-submission': ok({ orderId: 'INTERNAL-ID', orderNumber: 'ORD-1', paymentStatus: 'PENDING_VERIFICATION' }),
      });
      const response = await post(upi, { token: TOKEN, utr: '123456789012' });
      const data = await body(response);
      expect(data).toMatchObject({ orderNumber: 'ORD-1', paymentStatus: 'PENDING_VERIFICATION' });
      expect(data).not.toHaveProperty('orderId');
      expect(calls.map((c) => c.key)).toEqual(['POST /public/stores/asha/orders/lookup', 'POST /public/orders/INTERNAL-ID/upi-submission']);
    });

    it('a token from another store\'s order is not found here', async () => {
      mockApi({ 'POST /public/stores/asha/orders/lookup': fail(404, 'NOT_FOUND', 'We could not find an order with those details') });
      expect((await post(upi, { token: TOKEN, utr: '123456789012' })).status).toBe(404);
    });

    it('accepts no screenshot key and no unknown field, and checks the reference\'s shape', async () => {
      const calls = mockApi({});
      for (const extra of [{ screenshotKey: 'k' }, { orderId: 'x' }]) expect((await post(upi, { token: TOKEN, utr: '123456789012', ...extra })).status).toBe(400);
      expect((await post(upi, { token: TOKEN, utr: 'no' })).status).toBe(400);
      expect((await post(upi, { token: 'not-a-token', utr: '123456789012' })).status).toBe(400);
      expect(calls).toHaveLength(0);
    });
  });
});

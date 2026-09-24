import { beforeEach, describe, expect, it } from 'vitest';
import { clearStoreCache, cacheKey, getProduct, getStore, listProducts, lookupOrder, quoteCart, toPublicOrder, toStore } from '@/lib/store-data.js';
import { fail, mockApi, ok, rawProduct, rawStore, ULID } from './helpers.js';

const ctx = { ip: '203.0.113.7' };

describe('store data', () => {
  beforeEach(() => clearStoreCache());

  it('drops the internal businessId from the store, however it arrives', () => {
    const store = toStore(rawStore());
    expect(store).not.toHaveProperty('businessId');
    expect(JSON.stringify(store)).not.toContain('01HZZZZZZZZZZZZZZZZZZZZZZZ');
  });

  it('turns the API\'s branding flag into showBranding without looking at any plan', () => {
    expect(toStore(rawStore({ poweredByBranding: true })).showBranding).toBe(true);
    expect(toStore(rawStore({ poweredByBranding: false })).showBranding).toBe(false);
    expect(JSON.stringify(toStore(rawStore()))).not.toMatch(/starter|growth|planId/);
  });

  it('repairs a bad theme with the theme schema\'s own defaults', () => {
    expect(toStore(rawStore({ theme: { primaryColor: 'not-a-colour', cornerRadius: 'huge' } })).theme).toMatchObject({ primaryColor: '#2563EB', cornerRadius: 'medium' });
  });

  it('cache keys always begin with the store, so one merchant\'s response can never be another\'s', () => {
    expect(cacheKey('asha', '/', {})).toMatch(/^asha\|/);
    expect(cacheKey('asha', '/products', { q: 'a' })).not.toBe(cacheKey('demo', '/products', { q: 'a' }));
  });

  it('two stores read through the same server never see each other\'s data', async () => {
    mockApi({
      'GET /public/stores/asha': ok(rawStore({ slug: 'asha', name: 'Asha' })),
      'GET /public/stores/demo': ok(rawStore({ slug: 'demo', name: 'Demo' })),
    });
    expect((await getStore('asha', ctx)).name).toBe('Asha');
    expect((await getStore('demo', ctx)).name).toBe('Demo');
    expect((await getStore('asha', ctx)).name).toBe('Asha');
    expect((await getStore('demo', ctx)).name).toBe('Demo');
  });

  it('lists products per store and per query', async () => {
    mockApi({
      'GET /public/stores/asha/products': ({ url }) => ok({ items: [{ name: `asha:${url.searchParams.get('category') ?? 'all'}` }], nextCursor: null }),
      'GET /public/stores/demo/products': ok({ items: [{ name: 'demo' }], nextCursor: 'c1' }),
    });
    expect((await listProducts('asha', ctx, {})).items[0].name).toBe('asha:all');
    expect((await listProducts('asha', ctx, { category: 'kurtis' })).items[0].name).toBe('asha:kurtis');
    expect((await listProducts('demo', ctx, {})).items[0].name).toBe('demo');
  });

  it('search uses the API\'s search endpoint', async () => {
    const calls = mockApi({ 'GET /public/stores/asha/search': ok({ items: [], nextCursor: null }) });
    await listProducts('asha', ctx, { q: 'kurti' });
    expect(calls[0].url.pathname).toBe('/v1/public/stores/asha/search');
  });

  it('caches public reads briefly, but never an error', async () => {
    let n = 0;
    const calls = mockApi({ 'GET /public/stores/asha': () => (n++ === 0 ? fail(503, 'X') : ok(rawStore())) });
    await expect(getStore('asha', ctx)).rejects.toMatchObject({ unavailable: true });
    expect((await getStore('asha', ctx)).name).toBe('Asha Boutique');
    await getStore('asha', ctx);
    expect(calls).toHaveLength(2);
  });

  it('refuses a slug that is not a slug before it can become part of a URL', async () => {
    const calls = mockApi({});
    for (const bad of ['../admin', 'a/b', 'A B', '', 'x?y=1', 'a'.repeat(80)]) {
      await expect(getStore(bad, ctx), bad).rejects.toMatchObject({ status: 404 });
    }
    expect(calls).toHaveLength(0);
  });

  it('finds a product by the id in its address and ignores the name part', async () => {
    const calls = mockApi({ [`GET /public/stores/asha/products/${ULID}`]: ok(rawProduct()) });
    await getProduct('asha', ctx, `anything-at-all--${ULID}`);
    expect(calls[0].url.pathname).toBe(`/v1/public/stores/asha/products/${ULID}`);
    await expect(getProduct('asha', ctx, 'brake-pad')).rejects.toMatchObject({ status: 404 });
  });

  it('never caches quotes or orders — they belong to one shopper', async () => {
    let n = 0;
    const calls = mockApi({
      'POST /public/stores/asha/cart/quote': () => ok({ total: 100 * (n += 1) }),
      'POST /public/stores/asha/orders/lookup': () => ok({ orderId: 'X', orderNumber: `ORD-${n += 1}` }),
    });
    expect((await quoteCart('asha', ctx, { lines: [] })).total).toBe(100);
    expect((await quoteCart('asha', ctx, { lines: [] })).total).toBe(200);
    await lookupOrder('asha', ctx, 't');
    await lookupOrder('asha', ctx, 't');
    expect(calls).toHaveLength(4);
  });

  it('removes the internal order id from anything sent to a browser', () => {
    expect(toPublicOrder({ orderId: 'INTERNAL', orderNumber: 'ORD-1', trackingToken: 't' })).toEqual({ orderNumber: 'ORD-1', trackingToken: 't' });
  });
});

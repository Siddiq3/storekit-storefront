import { beforeEach, describe, expect, it } from 'vitest';
import { resolveHost, clearResolverCache } from '@/lib/resolver.js';
import { fail, mockApi, ok } from './helpers.js';

const resolveRoute = (table) => ({ url }) => {
  const host = url.searchParams.get('host');
  return host in table ? ok(table[host]) : fail(404, 'STORE_NOT_FOUND', 'Store not found');
};

describe('host resolution', () => {
  beforeEach(() => clearResolverCache());

  it('resolves a StoreKit hostname through the API and returns its answer', async () => {
    const calls = mockApi({ 'GET /public/hosts/resolve': resolveRoute({ 'asha.storekit.site': { slug: 'asha', canonicalHost: 'asha.storekit.site', redirect: false } }) });
    expect(await resolveHost('asha.storekit.site')).toEqual({ state: 'ok', slug: 'asha', canonicalHost: 'asha.storekit.site', redirect: false });
    expect(calls).toHaveLength(1);
    expect(calls[0].url.searchParams.get('host')).toBe('asha.storekit.site');
  });

  it('an unknown StoreKit hostname is not_found', async () => {
    mockApi({ 'GET /public/hosts/resolve': resolveRoute({}) });
    expect(await resolveHost('nobody.storekit.site')).toEqual({ state: 'not_found' });
  });

  it('an inactive store looks exactly like an unknown one: the API gives the same 404', async () => {
    mockApi({ 'GET /public/hosts/resolve': fail(404, 'STORE_NOT_FOUND', 'Store not found') });
    expect(await resolveHost('paused.storekit.site')).toEqual({ state: 'not_found' });
  });

  it('an invalid hostname never reaches the API', async () => {
    const calls = mockApi({ 'GET /public/hosts/resolve': resolveRoute({}) });
    for (const bad of ['', 'not a host', 'exa mple.com', 'evil.com/path', 'user@host.com', 'http://x.com', '203.0.113.9', '-bad-.storekit.site', null, undefined]) {
      expect(await resolveHost(bad), String(bad)).toEqual({ state: 'invalid' });
    }
    expect(calls).toHaveLength(0);
  });

  it('a custom domain resolves to its store and says where the canonical address is', async () => {
    mockApi({ 'GET /public/hosts/resolve': resolveRoute({
      'shop.example.com': { slug: 'asha', canonicalHost: 'shop.example.com', redirect: false },
      'asha.storekit.site': { slug: 'asha', canonicalHost: 'shop.example.com', redirect: true },
    }) });
    expect(await resolveHost('shop.example.com')).toMatchObject({ state: 'ok', slug: 'asha', redirect: false });
    expect(await resolveHost('asha.storekit.site')).toMatchObject({ state: 'ok', slug: 'asha', canonicalHost: 'shop.example.com', redirect: true });
  });

  it('tolerates the way real clients write a Host header, and passes the port on', async () => {
    const calls = mockApi({ 'GET /public/hosts/resolve': resolveRoute({ 'asha.lvh.me:3000': { slug: 'asha', canonicalHost: 'asha.lvh.me:3000', redirect: false } }) });
    expect((await resolveHost('ASHA.LVH.ME:3000')).state).toBe('ok');
    expect(calls[0].url.searchParams.get('host')).toBe('asha.lvh.me:3000');
  });

  it('is an outage, not a store, when the API is down, slow, rate limited or answers nonsense', async () => {
    for (const response of [fail(503, 'SERVICE_UNAVAILABLE'), fail(429, 'RATE_LIMITED'), fail(500, 'INTERNAL_ERROR'), ok({ slug: 'A B', canonicalHost: 'x' }), ok({})]) {
      clearResolverCache();
      mockApi({ 'GET /public/hosts/resolve': response });
      expect((await resolveHost('asha.storekit.site')).state).toBe('unavailable');
    }
    clearResolverCache();
    globalThis.fetch = async () => { throw new Error('boom'); };
    expect((await resolveHost('asha.storekit.site')).state).toBe('unavailable');
  });

  it('does not remember an outage, so the next visitor gets a fresh answer', async () => {
    let up = false;
    const calls = mockApi({ 'GET /public/hosts/resolve': () => (up ? ok({ slug: 'asha', canonicalHost: 'asha.storekit.site', redirect: false }) : fail(503, 'X')) });
    expect((await resolveHost('asha.storekit.site')).state).toBe('unavailable');
    up = true;
    expect((await resolveHost('asha.storekit.site')).state).toBe('ok');
    expect(calls).toHaveLength(2);
  });

  it('caches per hostname — one store\'s answer is never served for another host', async () => {
    const calls = mockApi({ 'GET /public/hosts/resolve': resolveRoute({
      'a.storekit.site': { slug: 'a', canonicalHost: 'a.storekit.site', redirect: false },
      'b.storekit.site': { slug: 'b', canonicalHost: 'b.storekit.site', redirect: false },
    }) });
    expect((await resolveHost('a.storekit.site')).slug).toBe('a');
    expect((await resolveHost('b.storekit.site')).slug).toBe('b');
    expect((await resolveHost('a.storekit.site')).slug).toBe('a');
    expect(calls).toHaveLength(2);
  });

  it('collapses a burst of first visits into one lookup', async () => {
    const calls = mockApi({ 'GET /public/hosts/resolve': resolveRoute({ 'a.storekit.site': { slug: 'a', canonicalHost: 'a.storekit.site', redirect: false } }) });
    await Promise.all(Array.from({ length: 20 }, () => resolveHost('a.storekit.site')));
    expect(calls).toHaveLength(1);
  });

  it('forwards the shopper address with the edge secret, so the API limits shoppers and not this server', async () => {
    const calls = mockApi({ 'GET /public/hosts/resolve': resolveRoute({ 'a.storekit.site': { slug: 'a', canonicalHost: 'a.storekit.site', redirect: false } }) });
    await resolveHost('a.storekit.site', { ip: '203.0.113.7' });
    expect(calls[0].headers['cf-connecting-ip']).toBe('203.0.113.7');
    expect(calls[0].headers['x-storekit-edge-secret']).toBe(process.env.EDGE_SHARED_SECRET);
  });
});

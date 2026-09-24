import { describe, expect, it } from 'vitest';
import { apiFetch } from '@/lib/api.js';
import { isApiError } from '@/lib/errors.js';
import { isIp, shopperIp } from '@/lib/ip.js';
import { loadConfig, ConfigError } from '@/lib/config.js';
import { fail, mockApi, ok } from './helpers.js';

const SECRET = process.env.EDGE_SHARED_SECRET;

describe('forwarding the shopper to the API', () => {
  it('sends the shopper address and the edge secret together', async () => {
    const calls = mockApi({ 'GET /public/x': ok({}) });
    await apiFetch('/public/x', { ip: '203.0.113.7' });
    expect(calls[0].headers['cf-connecting-ip']).toBe('203.0.113.7');
    expect(calls[0].headers['x-storekit-edge-secret']).toBe(SECRET);
  });

  it('sends neither when there is no shopper address — the secret is not sent for nothing', async () => {
    const calls = mockApi({ 'GET /public/x': ok({}) });
    await apiFetch('/public/x', { ip: null });
    expect(calls[0].headers['cf-connecting-ip']).toBeUndefined();
    expect(calls[0].headers['x-storekit-edge-secret']).toBeUndefined();
  });

  it('sends neither when no secret is configured: an address without proof would only be ignored', async () => {
    const saved = process.env.EDGE_SHARED_SECRET;
    delete process.env.EDGE_SHARED_SECRET;
    try {
      const calls = mockApi({ 'GET /public/x': ok({}) });
      await apiFetch('/public/x', { ip: '203.0.113.7' });
      expect(calls[0].headers['cf-connecting-ip']).toBeUndefined();
    } finally { process.env.EDGE_SHARED_SECRET = saved; }
  });

  it('never follows a redirect, so the secret cannot be handed to another host', async () => {
    const calls = mockApi({ 'GET /public/x': ok({}) });
    await apiFetch('/public/x', { ip: '203.0.113.7' });
    expect(calls[0].init.redirect).toBe('error');
  });

  it('sends the secret only to the configured API origin', async () => {
    const calls = mockApi({ 'GET /public/x': ok({}) });
    await apiFetch('/public/x', { ip: '203.0.113.7' });
    expect(calls[0].url.origin).toBe('https://api.test.local');
  });

  it('a 5xx is reported as unavailable with a fixed message: nothing from the backend leaks', async () => {
    mockApi({ 'GET /public/x': fail(500, 'INTERNAL_ERROR', `Error: ${SECRET} at /var/task/handler.js:12`) });
    const error = await apiFetch('/public/x').catch((e) => e);
    expect(isApiError(error)).toBe(true);
    expect(error.unavailable).toBe(true);
    expect(error.message).not.toContain(SECRET);
    expect(error.message).not.toContain('handler.js');
  });

  it('a 4xx keeps the API\'s shopper-facing message and code', async () => {
    mockApi({ 'GET /public/x': fail(409, 'TOTAL_MISMATCH', 'The total changed') });
    const error = await apiFetch('/public/x').catch((e) => e);
    expect(error).toMatchObject({ status: 409, code: 'TOTAL_MISMATCH', message: 'The total changed' });
    expect(error.unavailable).toBe(false);
  });

  it('a network failure is unavailable', async () => {
    globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
    const error = await apiFetch('/public/x').catch((e) => e);
    expect(error.unavailable).toBe(true);
  });
});

describe('shopper address', () => {
  it('accepts exactly one IPv4 or IPv6 address', () => {
    for (const good of ['203.0.113.7', '0.0.0.0', '255.255.255.255', '2001:db8::7', '::1', 'fe80::1', '2001:0db8:0000:0000:0000:ff00:0042:8329']) expect(isIp(good), good).toBe(true);
  });

  it('rejects everything else', () => {
    for (const bad of ['', ' ', '203.0.113.256', '203.0.113', '203.0.113.7:80', '203.0.113.7, 10.0.0.1', '203.0.113.7/32', 'localhost', 'example.com', '<script>', 'fe80::1%eth0', '[::1]', '1.2.3.4\n', null, undefined, 42, 'x'.repeat(100)]) expect(isIp(bad), String(bad)).toBe(false);
  });

  it('is read from the configured header, trimmed, and dropped if it is not one address', () => {
    const h = (v) => new Headers(v === undefined ? {} : { 'cf-connecting-ip': v });
    expect(shopperIp(h(' 203.0.113.7 '), 'cf-connecting-ip')).toBe('203.0.113.7');
    expect(shopperIp(h('203.0.113.7, 10.0.0.1'), 'cf-connecting-ip')).toBeNull();
    expect(shopperIp(h(undefined), 'cf-connecting-ip')).toBeNull();
  });

  it('an X-Forwarded-For sent by the visitor is not read unless it is the configured header', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.7' });
    expect(shopperIp(headers, 'cf-connecting-ip')).toBeNull();
  });
});

describe('configuration', () => {
  const base = { NODE_ENV: 'production', API_BASE_URL: 'https://api.storekit.site/v1', STOREFRONT_ROOT_URL: 'https://storekit.site', EDGE_SHARED_SECRET: SECRET };

  it('accepts the production setting', () => {
    const cfg = loadConfig(base);
    expect(cfg).toMatchObject({ apiBaseUrl: 'https://api.storekit.site/v1', rootUrl: 'https://storekit.site', rootScheme: 'https', clientIpHeader: 'cf-connecting-ip' });
  });

  it('requires the secret, an https API and the root in production', () => {
    expect(() => loadConfig({ ...base, EDGE_SHARED_SECRET: '' })).toThrow(ConfigError);
    expect(() => loadConfig({ ...base, API_BASE_URL: 'http://api.storekit.site/v1' })).toThrow(/https/);
    expect(() => loadConfig({ ...base, API_BASE_URL: '' })).toThrow(/API_BASE_URL/);
    expect(() => loadConfig({ ...base, STOREFRONT_ROOT_URL: '' })).toThrow(/STOREFRONT_ROOT_URL/);
  });

  it('refuses a secret too short to be one, and a header name that is not a header name', () => {
    expect(() => loadConfig({ ...base, EDGE_SHARED_SECRET: 'short' })).toThrow(/32/);
    expect(() => loadConfig({ ...base, CLIENT_IP_HEADER: 'x forwarded' })).toThrow(/header/);
  });

  it('takes the API address from the environment, staging included', () => {
    expect(loadConfig({ ...base, API_BASE_URL: 'https://api-staging.storekit.site/v1/' }).apiBaseUrl).toBe('https://api-staging.storekit.site/v1');
  });

  it('has local defaults outside production, and none for the secret', () => {
    const cfg = loadConfig({ NODE_ENV: 'development' });
    expect(cfg.apiBaseUrl).toBe('http://localhost:8787/v1');
    expect(cfg.rootScheme).toBe('http');
    expect(cfg.edgeSecret).toBeNull();
  });
});

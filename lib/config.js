/**
 * Server configuration, read from the environment on every call (cheap, and it lets tests change it).
 *
 * Nothing here is ever prefixed NEXT_PUBLIC_: these values are read only by server code (middleware, route
 * handlers, server components), and `scripts/verify-no-secret-in-bundle.mjs` checks the built browser bundle
 * for the secret. Imported by middleware, so it must stay edge-safe: no Node-only modules.
 */

export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

const text = (value) => (typeof value === 'string' ? value.trim() : '');
const stripSlash = (value) => value.replace(/\/+$/, '');

const httpUrl = (name, value) => {
  let url;
  try { url = new URL(value); } catch { throw new ConfigError(`${name} is not a URL`); }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new ConfigError(`${name} must be http(s)`);
  return url;
};

export const loadConfig = (env = process.env) => {
  const production = env.NODE_ENV === 'production';

  const api = text(env.API_BASE_URL) || (production ? '' : 'http://localhost:8787/v1');
  if (!api) throw new ConfigError('API_BASE_URL is required');
  const apiUrl = httpUrl('API_BASE_URL', api);
  if (production && apiUrl.protocol !== 'https:') throw new ConfigError('API_BASE_URL must be https in production');

  const root = text(env.STOREFRONT_ROOT_URL) || (production ? '' : 'http://lvh.me:3000');
  if (!root) throw new ConfigError('STOREFRONT_ROOT_URL is required');
  const rootUrl = httpUrl('STOREFRONT_ROOT_URL', root);

  const secret = text(env.EDGE_SHARED_SECRET);
  if (secret && secret.length < 32) throw new ConfigError('EDGE_SHARED_SECRET must be at least 32 characters');
  if (production && !secret) throw new ConfigError('EDGE_SHARED_SECRET is required in production');

  const header = (text(env.CLIENT_IP_HEADER) || 'cf-connecting-ip').toLowerCase();
  if (!/^[a-z0-9-]{1,64}$/.test(header)) throw new ConfigError('CLIENT_IP_HEADER is not a header name');

  return Object.freeze({
    production,
    apiBaseUrl: stripSlash(apiUrl.toString()),
    rootScheme: rootUrl.protocol.replace(':', ''),
    rootHost: rootUrl.host.toLowerCase(),
    rootUrl: stripSlash(rootUrl.origin),
    edgeSecret: secret || null,
    clientIpHeader: header,
    apiTimeoutMs: 8000,
  });
};

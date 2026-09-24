import { loadConfig } from './config.js';
import { ApiError, UNAVAILABLE_MESSAGE } from './errors.js';

/**
 * The only place that talks to the StoreKit API. It runs on the server (middleware, route handlers, server
 * components) and nowhere else: the browser never calls the API — the CSP says `connect-src 'self'` — because the
 * API's CORS list is exact origins and a wildcard is not acceptable.
 *
 * Every call carries the shopper's address and the shared edge secret, when both exist. The secret is sent only
 * to the configured API origin, redirects are refused so it cannot be forwarded elsewhere, and it is never
 * logged or returned to a caller.
 */

const parse = async (response) => {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
};

const unavailable = (retryAfter) =>
  new ApiError({ status: 0, code: 'UNAVAILABLE', message: UNAVAILABLE_MESSAGE, retryAfter });

/**
 * @param {string} path  relative to API_BASE_URL, e.g. `/public/hosts/resolve`
 * @param {{ method?: string, query?: object, body?: unknown, ip?: string|null, headers?: object }} options
 * @returns {Promise<{ data: any, meta: any }>}
 */
export const apiFetch = async (path, { method = 'GET', query, body, ip, headers: extra } = {}) => {
  const cfg = loadConfig();

  const url = new URL(`${cfg.apiBaseUrl}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }

  const headers = { accept: 'application/json', 'user-agent': 'storekit-storefront', ...extra };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (ip && cfg.edgeSecret) {
    headers['cf-connecting-ip'] = ip;
    headers['x-storekit-edge-secret'] = cfg.edgeSecret;
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(cfg.apiTimeoutMs),
    });
  } catch {
    throw unavailable();
  }

  const payload = await parse(response);
  const retryAfter = Number(response.headers.get('retry-after')) || undefined;

  if (response.ok && payload?.success === true) return { data: payload.data, meta: payload.meta };

  const error = payload?.error;
  // A 5xx says nothing a shopper can use, and its message is not ours to relay.
  if (response.status >= 500 || !error) throw unavailable(retryAfter);
  throw new ApiError({
    status: response.status,
    code: typeof error.code === 'string' ? error.code : 'ERROR',
    message: typeof error.message === 'string' ? error.message : 'Something went wrong.',
    details: Array.isArray(error.details) ? error.details : [],
    retryAfter,
  });
};

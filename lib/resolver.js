import { hostFromHeader } from '@storekit/shared';
import { apiFetch } from './api.js';
import { isApiError } from './errors.js';

/**
 * Host → store, by asking the API. The backend's `GET /v1/public/hosts/resolve` is the only authority on which
 * store a hostname belongs to (StoreKit subdomains and, later, custom domains alike); this file adds no rules of its
 * own. The shape of a Host header is checked with the shared `hostFromHeader`, the same function the API uses, and
 * everything else is the API's answer.
 *
 * The answer is kept for a short while so a page view is not a lookup, keyed by the hostname (never by anything
 * else), bounded so a flood of made-up hostnames cannot grow memory, and a "no" is kept for less time than a "yes"
 * so a domain that has just been verified starts working within seconds.
 */

const FOUND_TTL_MS = 30_000;
const MISSING_TTL_MS = 10_000;
const MAX_ENTRIES = 2000;

const cache = new Map();
const inflight = new Map();

export const clearResolverCache = () => { cache.clear(); inflight.clear(); };

const remember = (key, value, ttl) => {
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
  cache.set(key, { value, expires: Date.now() + ttl });
};

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

const lookup = async (key, ip) => {
  try {
    const { data } = await apiFetch('/public/hosts/resolve', { query: { host: key }, ip });
    // Defensive: a response that is not the contract is an outage, not a store.
    if (typeof data?.slug !== 'string' || !SLUG.test(data.slug) || typeof data?.canonicalHost !== 'string') {
      return { state: 'unavailable' };
    }
    const found = { state: 'ok', slug: data.slug, canonicalHost: data.canonicalHost.toLowerCase(), redirect: data.redirect === true };
    remember(key, found, FOUND_TTL_MS);
    return found;
  } catch (error) {
    if (isApiError(error) && (error.status === 404 || error.status === 400)) {
      const missing = { state: 'not_found' };
      remember(key, missing, MISSING_TTL_MS);
      return missing;
    }
    return { state: 'unavailable' };
  }
};

/**
 * @param {string|null} hostHeader  the request's Host header, as received
 * @returns {Promise<{state:'invalid'}|{state:'not_found'}|{state:'unavailable'}|{state:'ok', slug:string, canonicalHost:string, redirect:boolean}>}
 */
export const resolveHost = async (hostHeader, { ip } = {}) => {
  const host = hostFromHeader(hostHeader ?? '');
  if (!host) return { state: 'invalid' };

  const key = host.port === null ? host.hostname : `${host.hostname}:${host.port}`;

  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;

  // One lookup per host at a time: a burst of first visits is one call, not hundreds.
  if (!inflight.has(key)) {
    inflight.set(key, lookup(key, ip).finally(() => inflight.delete(key)));
  }
  return inflight.get(key);
};

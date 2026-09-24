import 'server-only';
import { headers } from 'next/headers';
import { loadConfig } from './config.js';
import { shopperIp } from './ip.js';
import { STORE_HEADERS } from './headers.js';

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Who this request is for: the store the middleware resolved, the address it was served on, and the shopper's
 * address for forwarding. The slug comes from the header the middleware sets after deleting any a client sent, and
 * is re-checked for shape here; there is no other way to name a store.
 *
 * @returns {Promise<{ slug: string, host: string, canonicalHost: string, ip: string|null } | null>}
 */
export const getRequestContext = async () => {
  const h = await headers();
  const slug = h.get(STORE_HEADERS.slug);
  if (!slug || !SLUG.test(slug)) return null;

  const cfg = loadConfig();
  return {
    slug,
    host: h.get(STORE_HEADERS.host) ?? '',
    canonicalHost: h.get(STORE_HEADERS.canonicalHost) ?? '',
    ip: shopperIp(h, cfg.clientIpHeader),
  };
};

import 'server-only';
import { cache } from 'react';
import { getRequestContext } from './request.js';
import { getStore } from './store-data.js';
import { isApiError } from './errors.js';

/**
 * The current store, or the reason there is not one. Wrapped in React's per-request `cache`, so the layout, the
 * metadata and the page of one request share a single lookup.
 *
 * @returns {Promise<{ ok: true, store: object, ctx: object, canonicalHost: string } | { ok: false, state: 'store-not-found'|'inactive'|'unavailable' }>}
 */
export const loadStoreOrState = cache(async () => {
  const ctx = await getRequestContext();
  if (!ctx) return { ok: false, state: 'store-not-found' };

  try {
    const store = await getStore(ctx.slug, ctx);
    return { ok: true, store, ctx, canonicalHost: ctx.canonicalHost };
  } catch (error) {
    if (isApiError(error)) {
      if (error.code === 'STORE_INACTIVE') return { ok: false, state: 'inactive' };
      if (error.status === 404) return { ok: false, state: 'store-not-found' };
    }
    return { ok: false, state: 'unavailable' };
  }
});

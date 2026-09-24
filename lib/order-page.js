import 'server-only';
import { notFound } from 'next/navigation';
import { trackingToken } from '@storekit/validation';
import { isApiError } from './errors.js';
import { loadStoreOrState } from './load.js';
import { lookupOrder, toPublicOrder } from './store-data.js';

/**
 * Loads the order behind `?t=<tracking token>` for the current store, or 404s. Shared by the "order placed" and "track
 * your order" pages. The token is checked for shape before it is used; the lookup is scoped to the resolved store, so a
 * token for another shop's order is simply not found here.
 *
 * @returns {Promise<{ order: object, token: string } | { state: 'unavailable' } | null>}
 */
export const loadOrder = async (searchParams) => {
  const loaded = await loadStoreOrState();
  if (!loaded.ok) return null;

  const raw = (await searchParams)?.t;
  const parsed = trackingToken.safeParse(Array.isArray(raw) ? raw[0] : raw);
  if (!parsed.success) notFound();

  try {
    const order = await lookupOrder(loaded.ctx.slug, loaded.ctx, parsed.data);
    return { order: toPublicOrder(order), token: parsed.data };
  } catch (error) {
    if (isApiError(error) && !error.unavailable) notFound();
    return { state: 'unavailable' };
  }
};

import 'server-only';
import { apiFetch } from './api.js';
import { ApiError } from './errors.js';
import { parseTheme } from './theme.js';
import { productIdFromParam } from './urls.js';

/**
 * Everything the storefront reads from, and writes to, the API for one store. Every function takes the store's slug
 * (from the resolved request, see request.js) and the shopper's address for forwarding.
 *
 * Public reads are kept briefly in this server's memory, because the API says they change rarely (its own
 * Cache-Control is 30–120 s). The cache key ALWAYS begins with the store's slug, so one merchant's response can never
 * be served for another; it never holds anything that belongs to one shopper (carts, quotes, orders); it holds
 * only successes; and concurrent misses share one call.
 */

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TTL = { store: 60_000, listing: 30_000, product: 30_000, settings: 120_000 };
const MAX_ENTRIES = 5000;

const cache = new Map();
const inflight = new Map();

export const clearStoreCache = () => { cache.clear(); inflight.clear(); };

export const cacheKey = (slug, path, query = {}) => {
  const q = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return `${slug}|${path}|${q}`;
};

const cached = (key, ttl, load) => {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.value);
  if (!inflight.has(key)) {
    inflight.set(key, load()
      .then((value) => {
        if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
        cache.set(key, { value, expires: Date.now() + ttl });
        return value;
      })
      .finally(() => inflight.delete(key)));
  }
  return inflight.get(key);
};

const base = (slug) => {
  if (!SLUG.test(String(slug))) throw new ApiError({ status: 404, code: 'STORE_NOT_FOUND', message: 'Store not found' });
  return `/public/stores/${slug}`;
};

/* ───────────── Shapes: what a page may see ───────────── */

/**
 * The public store, reduced to what the storefront renders. The API includes an internal `businessId` in this record;
 * it is dropped here, once, so no page, no metadata and no client component can ever carry it.
 */
export const toStore = (raw) => ({
  slug: raw.slug,
  name: raw.name,
  description: raw.description ?? '',
  logoUrl: raw.logoUrl ?? null,
  faviconUrl: raw.faviconUrl ?? null,
  contact: raw.contact ?? {},
  theme: parseTheme(raw.theme),
  banners: Array.isArray(raw.banners) ? raw.banners : [],
  announcement: raw.announcement?.enabled && raw.announcement?.text ? { text: raw.announcement.text } : null,
  sections: Array.isArray(raw.sections) ? raw.sections : [],
  social: raw.social ?? {},
  footerText: raw.footerText ?? '',
  // Published owner pages: `{ slug, title }` only; their text is fetched when a page is opened.
  pages: (Array.isArray(raw.pages) ? raw.pages : []).filter((p) => p?.slug && p?.title).map((p) => ({ slug: p.slug, title: p.title })),
  orderingPaused: Boolean(raw.orderingPaused),
  orderingPausedMessage: raw.orderingPausedMessage ?? '',
  delivery: raw.delivery ?? {},
  paymentMethods: Array.isArray(raw.paymentMethods) ? raw.paymentMethods : [],
  // From the plan's `removeBranding` entitlement, decided by the API; the storefront never looks at plan ids.
  showBranding: raw.poweredByBranding !== false,
});

/* ───────────── Reads ───────────── */

export const getStore = (slug, { ip } = {}) =>
  cached(cacheKey(slug, '/'), TTL.store, async () => toStore((await apiFetch(base(slug), { ip })).data));

export const getHome = (slug, { ip } = {}) =>
  cached(cacheKey(slug, '/home'), TTL.store, async () => {
    const { data } = await apiFetch(`${base(slug)}/home`, { ip });
    return {
      store: toStore(data.store),
      categories: data.categories ?? [],
      sections: data.sections ?? [],
    };
  });

export const getCategories = (slug, { ip } = {}) =>
  cached(cacheKey(slug, '/categories'), TTL.store, async () => (await apiFetch(`${base(slug)}/categories`, { ip })).data?.items ?? []);

export const getSettings = (slug, { ip } = {}) =>
  cached(cacheKey(slug, '/settings'), TTL.settings, async () => (await apiFetch(`${base(slug)}/settings`, { ip })).data);

/** One page of products. `query.q` uses the API's search endpoint; everything else its listing. */
export const listProducts = (slug, { ip } = {}, query = {}) => {
  const path = query.q ? '/search' : '/products';
  return cached(cacheKey(slug, path, query), TTL.listing, async () => {
    const { data, meta } = await apiFetch(`${base(slug)}${path}`, { ip, query });
    return { items: data?.items ?? [], nextCursor: data?.nextCursor ?? null, count: meta?.count };
  });
};

export const getProduct = (slug, { ip } = {}, param) => {
  const id = productIdFromParam(param);
  if (!id) return Promise.reject(new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Product not found' }));
  return cached(cacheKey(slug, '/products', { id }), TTL.product, async () => (await apiFetch(`${base(slug)}/products/${id}`, { ip })).data);
};

const PAGE_SLUG = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;

/** An owner-written page (shipping policy, about, ...). */
export const getPage = (slug, { ip } = {}, pageSlug) => {
  if (!PAGE_SLUG.test(String(pageSlug))) return Promise.reject(new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Page not found' }));
  return cached(cacheKey(slug, '/pages', { pageSlug }), TTL.store, async () => (await apiFetch(`${base(slug)}/pages/${pageSlug}`, { ip })).data);
};

/* ───────────── Shopper-specific calls: never cached ───────────── */

export const quoteCart = async (slug, { ip } = {}, input) =>
  (await apiFetch(`${base(slug)}/cart/quote`, { method: 'POST', body: input, ip })).data;

export const createOrder = async (slug, { ip } = {}, input, idempotencyKey) =>
  (await apiFetch(`${base(slug)}/orders`, {
    method: 'POST', body: input, ip, headers: { 'x-idempotency-key': idempotencyKey },
  })).data;

/** The order behind a tracking token, scoped to this store: a token for another store's order is a 404 here. */
export const lookupOrder = async (slug, { ip } = {}, token) =>
  (await apiFetch(`${base(slug)}/orders/lookup`, { method: 'POST', body: { token }, ip })).data;

/** Finding an order without its link: order number plus the mobile number on it. */
export const findOrder = async (slug, { ip } = {}, { orderNumber, mobile }) =>
  (await apiFetch(`${base(slug)}/orders/lookup`, { method: 'POST', body: { orderNumber, mobile }, ip })).data;

/**
 * Submits a UPI payment reference. The shopper supplies only the tracking token; the order id the API's route needs
 * is found here, server-side, from that token, so it never reaches the browser.
 */
export const submitUpiReference = async (slug, ctx, { token, utr, note }) => {
  const order = await lookupOrder(slug, ctx, token);
  return (await apiFetch(`/public/orders/${order.orderId}/upi-submission`, {
    method: 'POST', body: { token, utr, ...(note ? { note } : {}) }, ip: ctx.ip,
  })).data;
};

/** A public order with its internal id removed, for anything that will be rendered or sent to a browser. */
export const toPublicOrder = (order) => {
   
  const { orderId, ...rest } = order;
  return rest;
};

/**
 * Request headers the middleware sets, and the storefront trusts, to say which store a request is for.
 * They are set by the middleware and by nothing else: it deletes any copy a client sent before it adds its own.
 */
export const STORE_HEADERS = Object.freeze({
  slug: 'x-storekit-slug',
  host: 'x-storekit-host',
  canonicalHost: 'x-storekit-canonical-host',
});

/** Routes that exist only to be rewritten to for an unresolved host. Nobody may request them directly. */
export const STATE_PATHS = Object.freeze({
  notFound: '/store-not-found',
  invalidHost: '/invalid-host',
  unavailable: '/store-unavailable',
});

import { NextResponse } from 'next/server';
import { loadConfig, ConfigError } from '@/lib/config.js';
import { resolveHost } from '@/lib/resolver.js';
import { shopperIp } from '@/lib/ip.js';
import { STORE_HEADERS, STATE_PATHS } from '@/lib/headers.js';

/**
 * Hostname → store, for every request.
 *
 *   asha.storekit.site/products/x  ->  ask the API which store `asha.storekit.site` is
 *                                      -> the store's slug is passed to the page in a request header
 *
 * The store is never taken from the URL, a cookie, a query string or a body: only from the answer to "who is this
 * host?", which the API alone gives. Anything a client sends in the headers this file sets is deleted first.
 * A host that is not a store, is not a valid host, or could not be checked gets a state page with a real status
 * code, and no page ever renders without a resolved store.
 */

const STATE_ROUTES = new Set(Object.values(STATE_PATHS));

const state = (request, path, status, extra = {}) => {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = '';
  return NextResponse.rewrite(url, { status, headers: { 'cache-control': 'no-store', ...extra } });
};

export async function middleware(request) {
  const { pathname, search } = request.nextUrl;

  // The state pages are destinations for rewrites, not addresses.
  if (STATE_ROUTES.has(pathname)) return state(request, STATE_PATHS.notFound, 404);

  let cfg;
  try {
    cfg = loadConfig();
  } catch (error) {
    if (error instanceof ConfigError) return state(request, STATE_PATHS.unavailable, 503);
    throw error;
  }

  const ip = shopperIp(request.headers, cfg.clientIpHeader);
  const resolved = await resolveHost(request.headers.get('host'), { ip });

  if (resolved.state === 'invalid') return state(request, STATE_PATHS.invalidHost, 400);
  if (resolved.state === 'not_found') return state(request, STATE_PATHS.notFound, 404);
  if (resolved.state === 'unavailable') return state(request, STATE_PATHS.unavailable, 503, { 'retry-after': '10' });

  // The API says this is not the store's canonical address (a custom primary domain, say): send them there.
  if (resolved.redirect) {
    return NextResponse.redirect(`${cfg.rootScheme}://${resolved.canonicalHost}${pathname}${search}`, 308);
  }

  const headers = new Headers(request.headers);
  for (const name of Object.values(STORE_HEADERS)) headers.delete(name);
  headers.set(STORE_HEADERS.slug, resolved.slug);
  headers.set(STORE_HEADERS.host, request.headers.get('host') ?? '');
  headers.set(STORE_HEADERS.canonicalHost, resolved.canonicalHost);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Everything except Next's own static files. API routes and pages both need a resolved store.
  matcher: ['/((?!_next/static|_next/image).*)'],
};

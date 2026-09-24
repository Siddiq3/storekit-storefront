import 'server-only';
import { NextResponse } from 'next/server';
import { getRequestContext } from './request.js';
import { isApiError, UNAVAILABLE_MESSAGE } from './errors.js';
import { ConfigError } from './config.js';

/**
 * The storefront's own JSON endpoints (`/api/...`): the browser talks to these, and only these, and they talk to the
 * StoreKit API. That is the whole "server-side only" rule made concrete — the browser never sees the API's address
 * or the edge secret, and the CSP forbids it from calling anywhere else.
 *
 * Each handler:
 *   - names its store only from the resolved request, never from the body (bodies are validated with the API's own
 *     strict schemas, which reject a `businessId` or `slug` field outright);
 *   - refuses a request that did not come from this store's own page (Origin must match Host);
 *   - answers with curated errors, never a backend message or a stack.
 */

const noStore = { 'cache-control': 'no-store' };

export const json = (body, status = 200, headers = {}) =>
  NextResponse.json(body, { status, headers: { ...noStore, ...headers } });

export const failure = (status, code, message, details) => json({ error: { code, message, ...(details ? { details } : {}) } }, status);

/** A POST from another site's page is refused; a browser always sends Origin on a cross-site or same-site POST. */
export const sameOrigin = (request) => {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return false;
  try { return new URL(origin).host.toLowerCase() === host.toLowerCase(); } catch { return false; }
};

const MAX_BODY_BYTES = 64 * 1024;

const readJson = async (request) => {
  const type = request.headers.get('content-type') ?? '';
  if (!type.toLowerCase().startsWith('application/json')) return { error: failure(415, 'UNSUPPORTED_MEDIA_TYPE', 'Send JSON.') };
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) return { error: failure(413, 'PAYLOAD_TOO_LARGE', 'That request is too large.') };
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return { error: failure(413, 'PAYLOAD_TOO_LARGE', 'That request is too large.') };
  try { return { value: JSON.parse(text) }; } catch { return { error: failure(400, 'VALIDATION_ERROR', 'That request was not valid.') }; }
};

/** Turns whatever a handler threw into a response a shopper can be shown. */
export const respondToError = (error) => {
  if (isApiError(error)) {
    if (error.status === 429) return failure(429, 'RATE_LIMITED', 'Too many attempts. Please wait a moment and try again.');
    if (error.unavailable) return failure(503, 'UNAVAILABLE', UNAVAILABLE_MESSAGE, undefined);
    // 4xx from the API are written for shoppers (validation, out of stock, total changed, ordering paused ...).
    return failure(error.status, error.code, error.message, error.details.length ? error.details : undefined);
  }
  if (error instanceof ConfigError) return failure(503, 'UNAVAILABLE', UNAVAILABLE_MESSAGE);
  return failure(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
};

/**
 * @param {Request} request
 * @param {{ schema: import('zod').ZodTypeAny, run: (input:any, ctx:object, request:Request)=>Promise<any>, status?: number }} options
 */
export const handleStorePost = async (request, { schema, run, status = 200 }) => {
  if (!sameOrigin(request)) return failure(403, 'FORBIDDEN', 'This request was not allowed.');

  const ctx = await getRequestContext();
  if (!ctx) return failure(404, 'STORE_NOT_FOUND', 'Store not found.');

  const parsed = await readJson(request);
  if (parsed.error) return parsed.error;

  const checked = schema.safeParse(parsed.value);
  if (!checked.success) {
    return failure(400, 'VALIDATION_ERROR', 'Some details need attention.',
      checked.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
  }

  try {
    return json(await run(checked.data, ctx, request), status);
  } catch (error) {
    return respondToError(error);
  }
};

export const IDEMPOTENCY_KEY = /^[A-Za-z0-9_-]{8,128}$/;

/**
 * How the browser talks: to this storefront's own `/api/*` and nowhere else. It never sees the StoreKit API's address
 * or the edge secret, and the CSP (`connect-src 'self'`) would stop it if it tried.
 *
 * @returns {Promise<{ ok: true, data: any } | { ok: false, status: number, code: string, message: string, details: any[] }>}
 */
export const postJson = async (path, body, headers = {}) => {
  if (!path.startsWith('/api/')) throw new Error('The browser may only call the storefront\'s own /api routes');
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      credentials: 'same-origin',
    });
    const payload = await response.json().catch(() => null);
    if (response.ok) return { ok: true, data: payload };
    const error = payload?.error ?? {};
    return {
      ok: false,
      status: response.status,
      code: error.code ?? 'ERROR',
      message: error.message ?? 'Something went wrong. Please try again.',
      details: Array.isArray(error.details) ? error.details : [],
    };
  } catch {
    return { ok: false, status: 0, code: 'UNAVAILABLE', message: 'We could not reach the store. Check your connection and try again.', details: [] };
  }
};

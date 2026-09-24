/**
 * Shopper address handling. Edge-safe (no `node:net`).
 *
 * The storefront forwards the shopper's address to the API so that the API's per-IP limits apply to shoppers and
 * not to this one server. The address comes from one configured header (`CLIENT_IP_HEADER`, Cloudflare's
 * `CF-Connecting-IP` by default), which is only trustworthy if this app is reachable solely through that edge, and
 * it must be exactly one address: a list, a port or junk is dropped, never passed on.
 */

const OCTET = '(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const IPV4 = new RegExp(`^${OCTET}(?:\\.${OCTET}){3}$`);

export const isIp = (value) => {
  if (typeof value !== 'string' || value.length === 0 || value.length > 45) return false;
  if (IPV4.test(value)) return true;
  if (!value.includes(':') || !/^[0-9a-f:.]+$/i.test(value)) return false;
  try {
    // The URL parser is a full IPv6 validator; anything it accepts inside brackets is a real address.
    return new URL(`http://[${value}]/`).hostname.length > 0;
  } catch {
    return false;
  }
};

/** The shopper's address from a request's headers, or null. */
export const shopperIp = (headers, headerName) => {
  const raw = headers.get(headerName);
  if (raw === null) return null;
  const value = raw.trim();
  return isIp(value) ? value : null;
};

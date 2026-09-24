import { loadConfig } from './config.js';

/**
 * Store paths and absolute addresses.
 *
 * Absolute addresses are built from the canonical host the API returned for this store — never from the request's Host
 * header — so a store's canonical URL is always its own address, whichever name it was reached on.
 */

/** `/products/cotton-kurti--<ULID>`: the API accepts the pretty slug plus the id, and only the id is authoritative. */
export const productPath = (product) =>
  `/products/${product.slug ? `${product.slug}--` : ''}${product.productId}`;

/** The id at the end of a product path segment, or null. */
export const productIdFromParam = (param) => {
  const match = /(?:^|--)([0-9A-HJKMNP-TV-Z]{26})$/i.exec(String(param ?? ''));
  return match ? match[1].toUpperCase() : null;
};

export const categoryPath = (category) => `/category/${category.slug}`;

export const absoluteUrl = (canonicalHost, path = '/') => {
  const { rootScheme } = loadConfig();
  return `${rootScheme}://${canonicalHost}${path}`;
};

/** A link that came from a merchant is used only if it is https. */
export const safeHttpsUrl = (value) => {
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
};

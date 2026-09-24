import { loadStoreOrState } from '@/lib/load.js';
import { absoluteUrl } from '@/lib/urls.js';

// Per host: each store's robots.txt points at its own sitemap, on its own canonical address.
export default async function robots() {
  const loaded = await loadStoreOrState();
  if (!loaded.ok) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/cart', '/checkout', '/order/', '/api/', '/search', '/track'] }],
    sitemap: absoluteUrl(loaded.canonicalHost, '/sitemap.xml'),
  };
}

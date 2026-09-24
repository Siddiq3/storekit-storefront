import { loadStoreOrState } from '@/lib/load.js';
import { getCategories, listProducts } from '@/lib/store-data.js';
import { absoluteUrl, categoryPath, productPath } from '@/lib/urls.js';

const MAX_PAGES = 20; // 20 × 48 = 960 products; a store bigger than that needs a sitemap index

// Only this store's own pages, on its canonical address.
export default async function sitemap() {
  const loaded = await loadStoreOrState();
  if (!loaded.ok) return [];
  const { ctx, canonicalHost } = loaded;
  const url = (path) => absoluteUrl(canonicalHost, path);

  const entries = [{ url: url('/') }, { url: url('/products') }];

  try {
    for (const category of await getCategories(ctx.slug, ctx)) entries.push({ url: url(categoryPath(category)) });

    let cursor;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const result = await listProducts(ctx.slug, ctx, { sort: 'newest', limit: 48, cursor });
      for (const product of result.items) entries.push({ url: url(productPath(product)) });
      if (!result.nextCursor) break;
      cursor = result.nextCursor;
    }
  } catch {
    // A partial sitemap is better than none; the pages themselves are unaffected.
  }
  return entries;
}

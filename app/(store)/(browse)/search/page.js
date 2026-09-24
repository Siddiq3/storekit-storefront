import { EmptyProducts, ProductGrid } from '@/components/ProductGrid.jsx';
import { StateScreen } from '@/components/StateScreen.jsx';
import { isApiError } from '@/lib/errors.js';
import { parseListingParams } from '@/lib/listing.js';
import { loadStoreOrState } from '@/lib/load.js';
import { listProducts } from '@/lib/store-data.js';
import { noindex } from '@/lib/seo.js';

// Search results are not pages worth indexing.
export const metadata = noindex('Search');

export default async function Search({ searchParams }) {
  const loaded = await loadStoreOrState();
  if (!loaded.ok) return null;
  const { store, ctx } = loaded;
  const { q } = parseListingParams(await searchParams);

  if (q.length < 2) {
    return (
      <>
        <h1>Search</h1>
        <p className="sk-hint">Type at least two letters in the search box above.</p>
      </>
    );
  }

  let items;
  try {
    items = (await listProducts(ctx.slug, ctx, { q, limit: 48 })).items;
  } catch (error) {
    if (isApiError(error) && !error.unavailable) return <EmptyProducts message="We could not search for that. Try different words." />;
    return <StateScreen kind="unavailable" />;
  }

  return (
    <>
      <h1>Results for “{q}”</h1>
      {items.length === 0
        ? <EmptyProducts message={`Nothing matches “${q}”. Try a shorter or different word.`} />
        : <ProductGrid products={items} layout={store.theme.layout} storeName={store.name} label="Search results" />}
    </>
  );
}

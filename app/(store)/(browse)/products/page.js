import { notFound } from 'next/navigation';
import { EmptyProducts, ProductGrid } from '@/components/ProductGrid.jsx';
import { Pager } from '@/components/Pager.jsx';
import { SortForm } from '@/components/SortForm.jsx';
import { StateScreen } from '@/components/StateScreen.jsx';
import { isApiError } from '@/lib/errors.js';
import { parseListingParams } from '@/lib/listing.js';
import { loadStoreOrState } from '@/lib/load.js';
import { listProducts } from '@/lib/store-data.js';
import { pageMetadata } from '@/lib/seo.js';

export async function generateMetadata() {
  const loaded = await loadStoreOrState();
  if (!loaded.ok) return {};
  return pageMetadata({ ...loaded, path: '/products', title: `All products — ${loaded.store.name}`, description: `Browse everything at ${loaded.store.name}.` });
}

export default async function Products({ searchParams }) {
  const loaded = await loadStoreOrState();
  if (!loaded.ok) return null;
  const { store, ctx } = loaded;
  const { sort, cursor } = parseListingParams(await searchParams);

  let page;
  try {
    page = await listProducts(ctx.slug, ctx, { sort, cursor, limit: 24 });
  } catch (error) {
    if (isApiError(error) && !error.unavailable) notFound();
    return <StateScreen kind="unavailable" />;
  }

  return (
    <>
      <div className="sk-toolbar"><h1>All products</h1><SortForm sort={sort} /></div>
      {page.items.length === 0 ? <EmptyProducts /> : <ProductGrid products={page.items} layout={store.theme.layout} storeName={store.name} label="All products" />}
      <Pager pathname="/products" params={{ sort: sort === 'newest' ? '' : sort }} nextCursor={page.nextCursor} />
    </>
  );
}

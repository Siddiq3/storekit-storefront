import { notFound } from 'next/navigation';
import { EmptyProducts, ProductGrid } from '@/components/ProductGrid.jsx';
import { Pager } from '@/components/Pager.jsx';
import { SortForm } from '@/components/SortForm.jsx';
import { StateScreen } from '@/components/StateScreen.jsx';
import { isApiError } from '@/lib/errors.js';
import { parseListingParams } from '@/lib/listing.js';
import { loadStoreOrState } from '@/lib/load.js';
import { getCategories, listProducts } from '@/lib/store-data.js';
import { breadcrumbLd, categoryMetadata, safeJsonLd } from '@/lib/seo.js';
import { categoryPath } from '@/lib/urls.js';

const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;

const findCategory = async (ctx, slug) => {
  if (!SLUG.test(slug)) return null;
  const categories = await getCategories(ctx.slug, ctx);
  return categories.find((c) => c.slug === slug) ?? null;
};

export async function generateMetadata({ params }) {
  const loaded = await loadStoreOrState();
  if (!loaded.ok) return {};
  const category = await findCategory(loaded.ctx, (await params).categorySlug).catch(() => null);
  return category ? categoryMetadata({ ...loaded, category }) : { title: 'Not found', robots: { index: false } };
}

export default async function CategoryPage({ params, searchParams }) {
  const loaded = await loadStoreOrState();
  if (!loaded.ok) return null;
  const { store, ctx, canonicalHost } = loaded;
  const slug = (await params).categorySlug;
  const { sort, cursor } = parseListingParams(await searchParams);

  let category;
  let page;
  try {
    category = await findCategory(ctx, slug);
    if (!category) notFound();
    page = await listProducts(ctx.slug, ctx, { category: slug, sort, cursor, limit: 24 });
  } catch (error) {
    if (isApiError(error)) {
      if (!error.unavailable) notFound();
      return <StateScreen kind="unavailable" />;
    }
    throw error; // notFound() and real bugs both propagate
  }

  return (
    <>
      <nav className="sk-breadcrumb" aria-label="Breadcrumb"><a href="/">{store.name}</a> / {category.name}</nav>
      <div className="sk-toolbar"><h1>{category.name}</h1><SortForm sort={sort} /></div>
      {page.items.length === 0
        ? <EmptyProducts message="Nothing in this category yet." />
        : <ProductGrid products={page.items} layout={store.theme.layout} storeName={store.name} label={category.name} />}
      <Pager pathname={categoryPath(category)} params={{ sort: sort === 'newest' ? '' : sort }} nextCursor={page.nextCursor} />
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd({ canonicalHost, trail: [{ name: store.name, path: '/' }, { name: category.name, path: categoryPath(category) }] })) }}
      />
    </>
  );
}

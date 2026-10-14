import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { AddToCart } from '@/components/AddToCart.jsx';
import { BuyPerks } from '@/components/ValueStrip.jsx';
import { ReturnsNote } from '@/components/ReturnsNote.jsx';
import { Gallery } from '@/components/Gallery.jsx';
import { OfferList } from '@/components/Offers.jsx';
import { ProductGrid } from '@/components/ProductGrid.jsx';
import { StateScreen } from '@/components/StateScreen.jsx';
import { isApiError } from '@/lib/errors.js';
import { loadStoreOrState } from '@/lib/load.js';
import { getCategories, getProduct, listProducts } from '@/lib/store-data.js';
import { breadcrumbLd, productLd, productMetadata, safeJsonLd } from '@/lib/seo.js';
import { categoryPath, productPath } from '@/lib/urls.js';

const NOT_FOUND_META = { title: 'Product not found', robots: { index: false, follow: false } };

export async function generateMetadata({ params }) {
  const loaded = await loadStoreOrState();
  if (!loaded.ok) return {};
  try {
    const product = await getProduct(loaded.ctx.slug, loaded.ctx, (await params).productSlug);
    return productMetadata({ ...loaded, product });
  } catch {
    return NOT_FOUND_META;
  }
}

export default async function ProductPage({ params, searchParams }) {
  const loaded = await loadStoreOrState();
  if (!loaded.ok) return null;
  const { store, ctx, canonicalHost } = loaded;
  const param = (await params).productSlug;

  let product;
  try {
    product = await getProduct(ctx.slug, ctx, param);
  } catch (error) {
    if (isApiError(error)) {
      if (!error.unavailable) notFound();
      return <StateScreen kind="unavailable" />;
    }
    throw error;
  }

  // Only the id in the address is authoritative; a stale or missing name part is corrected, not trusted.
  const canonical = productPath(product);
  let decoded;
  try { decoded = decodeURIComponent(param); } catch { notFound(); }
  if (decoded !== canonical.replace('/products/', '')) {
    // Preserve only the opaque attribution reference across canonical product redirects.
    const ref = (await searchParams)?.sk_ig;
    const suffix = typeof ref === 'string' && /^[A-Za-z0-9_-]{32}$/.test(ref) ? '?sk_ig=' + encodeURIComponent(ref) : '';
    permanentRedirect(canonical + suffix);
  }

  const images = product.images ?? [];
  // More from the same category (or the newest in the shop), never this product again. Optional: a failure shows none.
  const categories = await getCategories(ctx.slug, ctx).catch(() => []);
  const category = categories.find((c) => c.categoryId === product.categoryId);
  const others = (query) => listProducts(ctx.slug, ctx, { ...query, limit: 9 })
    .then((page) => page.items.filter((p) => p.productId !== product.productId).slice(0, 8))
    .catch(() => []);
  const inCategory = category ? await others({ category: category.slug }) : [];
  const related = inCategory.length ? inCategory : await others({ sort: 'newest' });

  return (
    <>
      <nav className="sk-breadcrumb" aria-label="Breadcrumb"><Link href="/" prefetch={false}>{store.name}</Link> / {category ? <Link href={categoryPath(category)} prefetch={false}>{category.name}</Link> : <Link href="/products" prefetch={false}>Products</Link>} / <span aria-current="page">{product.name}</span></nav>
      {store.orderingPaused ? <p className="sk-notice" role="status">{store.orderingPausedMessage || 'This shop is not taking orders right now.'}</p> : null}
      <article className="sk-product">
        <Gallery images={images} name={product.name} />
        <div>
          {product.brand ? <p className="sk-hint">{product.brand}</p> : null}
          <h1>{product.name}</h1>
          {product.inStock === false ? (
            <p className="sk-notice" role="status">This product is not available right now.</p>
          ) : null}
          <AddToCart
            product={{
              productId: product.productId,
              slug: product.slug,
              name: product.name,
              imageUrl: product.imageUrl,
              price: product.price,
              mrp: product.mrp,
              inStock: product.inStock,
              stockLabel: product.stockLabel,
              stockRemaining: product.stockRemaining,
              hasVariants: product.hasVariants,
              variantOptions: product.variantOptions ?? [],
              variants: product.variants ?? [],
            }}
          />
          {product.inStock === false ? null : <OfferList offers={store.offers} />}
          <section className="sk-services" aria-labelledby="sk-h-services">
            <h2 id="sk-h-services">Delivery &amp; services</h2>
            {product.inStock === false ? null : <BuyPerks store={store} />}
            <ReturnsNote returns={store.returns} policy={store.policies.find((p) => p.type === 'refund')} />
          </section>
          {product.summary || product.description ? (
            <section className="sk-details" aria-labelledby="sk-h-details">
              <h2 id="sk-h-details">Product details</h2>
              {product.summary ? <p>{product.summary}</p> : null}
              {product.description ? <div className="sk-desc">{product.description}</div> : null}
            </section>
          ) : null}
        </div>
      </article>
      {related.length ? (
        <section className="sk-section" aria-labelledby="sk-h-related">
          <div className="sk-section-head"><h2 id="sk-h-related">{inCategory.length ? `More in ${category.name}` : 'You may also like'}</h2></div>
          <ProductGrid products={related} layout={store.theme.layout} label="Similar products" rail />
        </section>
      ) : null}
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: safeJsonLd([productLd({ store, canonicalHost, product }), breadcrumbLd({ canonicalHost, trail: [{ name: store.name, path: '/' }, { name: product.name, path: canonical }] })]) }}
      />
    </>
  );
}

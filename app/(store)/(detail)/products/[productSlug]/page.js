import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { AddToCart } from '@/components/AddToCart.jsx';
import { Gallery } from '@/components/Gallery.jsx';
import { StateScreen } from '@/components/StateScreen.jsx';
import { isApiError } from '@/lib/errors.js';
import { loadStoreOrState } from '@/lib/load.js';
import { getProduct } from '@/lib/store-data.js';
import { breadcrumbLd, productLd, productMetadata, safeJsonLd } from '@/lib/seo.js';
import { productPath } from '@/lib/urls.js';

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

export default async function ProductPage({ params }) {
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
  if (decoded !== canonical.replace('/products/', '')) permanentRedirect(canonical);

  const images = product.images ?? [];

  return (
    <>
      <nav className="sk-breadcrumb" aria-label="Breadcrumb"><Link href="/">{store.name}</Link> / <Link href="/products">Products</Link> / {product.name}</nav>
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
          {product.summary ? <p>{product.summary}</p> : null}
          {product.description ? <div className="sk-desc">{product.description}</div> : null}
        </div>
      </article>
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: safeJsonLd([productLd({ store, canonicalHost, product }), breadcrumbLd({ canonicalHost, trail: [{ name: store.name, path: '/' }, { name: product.name, path: canonical }] })]) }}
      />
    </>
  );
}

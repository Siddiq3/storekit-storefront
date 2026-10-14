import Link from 'next/link';
import { Offers } from '@/components/Offers.jsx';
import { Banners } from '@/components/Banners.jsx';
import { CategoryCards } from '@/components/CategoryCards.jsx';
import { ArrowIcon } from '@/components/icons.jsx';
import { ValueStrip } from '@/components/ValueStrip.jsx';
import { EmptyProducts, ProductGrid } from '@/components/ProductGrid.jsx';
import { StateScreen } from '@/components/StateScreen.jsx';
import { getHome, listProducts } from '@/lib/store-data.js';
import { loadStoreOrState } from '@/lib/load.js';
import { storeMetadata } from '@/lib/seo.js';

export async function generateMetadata() {
  const loaded = await loadStoreOrState();
  return loaded.ok ? storeMetadata(loaded) : {};
}

const SectionHead = ({ id, title }) => (
  <div className="sk-section-head">
    <h2 id={id}>{title}</h2>
    <Link className="sk-pill" href="/products" prefetch={false}>View all <ArrowIcon /></Link>
  </div>
);

export default async function Home() {
  const loaded = await loadStoreOrState();
  if (!loaded.ok) return null; // the layout is already showing the reason
  const { store, ctx } = loaded;

  let home;
  try {
    home = await getHome(ctx.slug, ctx);
  } catch {
    return <StateScreen kind="unavailable" />;
  }

  // Sections are the owner's choices (featured, new arrivals, sale, best sellers). A store that has none set up
  // still shows its catalogue, so a new shop is never an empty page.
  const sections = home.sections;
  let latest = [];
  if (sections.length === 0) {
    try { latest = (await listProducts(ctx.slug, ctx, { sort: 'newest', limit: 24 })).items; } catch { latest = []; }
  }
  const shown = [...sections.flatMap((x) => x.products), ...latest];
  // A category the owner gave no photo borrows one of its own products' photos, so tiles are pictures, not letters.
  const categories = home.categories.filter((c) => !c.parentId).slice(0, 8)
    .map((c) => (c.imageUrl ? c : { ...c, imageUrl: shown.find((p) => p.categoryId === c.categoryId && p.imageUrl)?.imageUrl }));
  const hasBanners = store.banners.some((b) => b.imageUrl);
  // Up to three real product photos for the hero, never the same product twice.
  const photos = [...new Map(shown.filter((p) => p.imageUrl).map((p) => [p.productId, p])).values()].slice(0, 3);

  return (
    <>
      {/* With banners the owner's own pictures lead, edge to edge. Without them the shop introduces itself on a band of
          its own colour, beside a few of its real product photos. */}
      {hasBanners ? (
        <div className="sk-intro" data-banner="">
          <h1 className="sk-visually-hidden">{store.name}</h1>
          <Banners banners={store.banners} />
        </div>
      ) : (
        <div className="sk-intro">
          <div className="sk-hero" data-photos={photos.length ? photos.length : undefined}>
            <div className="sk-hero-copy">
              <h1>{store.name}</h1>
              {store.description ? <p>{store.description}</p> : null}
              <Link className="sk-button sk-hero-cta" href="/products" prefetch={false}>Shop now <ArrowIcon /></Link>
            </div>
            {photos.length ? (
              <div className="sk-hero-photos" aria-hidden="true">
                {photos.map((p) => <img key={p.productId} src={p.imageUrl} alt="" width="400" height="500" />)}
              </div>
            ) : null}
          </div>
        </div>
      )}

      <ValueStrip store={store} />

      {store.orderingPaused ? (
        <p className="sk-notice" role="status" style={{ marginTop: 24 }}>{store.orderingPausedMessage || 'This shop is not taking orders right now. You can still look around.'}</p>
      ) : null}

      <Offers offers={store.offers} />

      {categories.length ? (
        <section className="sk-section" aria-labelledby="sec-categories">
          <div className="sk-section-head"><h2 id="sec-categories">Shop by category</h2></div>
          <CategoryCards categories={categories} />
        </section>
      ) : null}

      {sections.map((section) => (
        <section className="sk-section" data-section={section.type} key={`${section.type}-${section.sortOrder}`} aria-labelledby={`sec-${section.type}`}>
          <SectionHead id={`sec-${section.type}`} title={section.title} />
          <ProductGrid products={section.products} layout={store.theme.layout} label={section.title} rail />
        </section>
      ))}

      {sections.length === 0 && latest.length > 0 ? (
        <section className="sk-section" aria-labelledby="sec-latest">
          <SectionHead id="sec-latest" title="Latest products" />
          <ProductGrid products={latest} layout={store.theme.layout} label="Latest products" />
        </section>
      ) : null}

      {sections.length === 0 && latest.length === 0 ? (
        <div style={{ marginTop: 40 }}><EmptyProducts message="This shop is getting ready. Its products will appear here soon." /></div>
      ) : null}
    </>
  );
}

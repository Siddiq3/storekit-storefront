import Link from 'next/link';
import { Banners } from '@/components/Banners.jsx';
import { CategoryCards } from '@/components/CategoryCards.jsx';
import { ArrowIcon } from '@/components/icons.jsx';
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
    <Link className="sk-pill" href="/products">View All <ArrowIcon /></Link>
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
  const categories = home.categories.filter((c) => !c.parentId).slice(0, 6);

  return (
    <>
      <div className="sk-hero">
        <h1>{store.name}</h1>
        {store.description ? <p>{store.description}</p> : null}
      </div>

      <Banners banners={store.banners} />

      {store.orderingPaused ? (
        <p className="sk-notice" role="status" style={{ marginTop: 24 }}>{store.orderingPausedMessage || 'This shop is not taking orders right now. You can still look around.'}</p>
      ) : null}

      {categories.length ? (
        <section className="sk-section" aria-labelledby="sec-categories">
          <div className="sk-section-head"><h2 id="sec-categories">Featured Categories</h2></div>
          <CategoryCards categories={categories} />
        </section>
      ) : null}

      {sections.map((section) => (
        <section className="sk-section" key={`${section.type}-${section.sortOrder}`} aria-labelledby={`sec-${section.type}`}>
          <SectionHead id={`sec-${section.type}`} title={section.title} />
          <ProductGrid products={section.products} layout={store.theme.layout} label={section.title} storeName={store.name} />
        </section>
      ))}

      {sections.length === 0 && latest.length > 0 ? (
        <section className="sk-section" aria-labelledby="sec-latest">
          <SectionHead id="sec-latest" title="Featured Products" />
          <ProductGrid products={latest} layout={store.theme.layout} label="Featured Products" storeName={store.name} />
        </section>
      ) : null}

      {sections.length === 0 && latest.length === 0 ? (
        <div style={{ marginTop: 40 }}><EmptyProducts message="This shop is getting ready. Its products will appear here soon." /></div>
      ) : null}
    </>
  );
}

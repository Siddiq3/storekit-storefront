import { CartProvider } from '@/components/CartProvider.jsx';
import { Footer } from '@/components/Footer.jsx';
import { Header } from '@/components/Header.jsx';
import { ValueStrip } from '@/components/ValueStrip.jsx';
import { StateScreen } from '@/components/StateScreen.jsx';
import { getCategories } from '@/lib/store-data.js';
import { themeVars } from '@/lib/theme.js';
import { organizationLd, safeJsonLd, storeMetadata } from '@/lib/seo.js';
import { loadStoreOrState } from '@/lib/load.js';

export async function generateMetadata() {
  const loaded = await loadStoreOrState();
  if (!loaded.ok) return { title: 'StoreKit', robots: { index: false, follow: false } };
  return storeMetadata(loaded);
}

export async function generateViewport() {
  const loaded = await loadStoreOrState();
  return loaded.ok ? { themeColor: loaded.store.theme.primaryColor } : {};
}

export default async function StoreLayout({ children }) {
  const loaded = await loadStoreOrState();
  if (!loaded.ok) {
    return <main className="sk-plain"><StateScreen kind={loaded.state} /></main>;
  }

  const { store, ctx } = loaded;
  // Categories are navigation, not content the page needs: a failure here must not take the store down.
  const categories = await getCategories(ctx.slug, ctx).catch(() => []);

  return (
    <CartProvider>
      <div className="sk-root" style={themeVars(store.theme)}>
        {store.announcement ? <div className="sk-announcement" role="status">{store.announcement.text}</div> : null}
        <Header store={store} categories={categories} />
        <main className="sk-main"><div className="sk-container sk-page">{children}</div></main>
        <div className="sk-container"><ValueStrip store={store} /></div>
        <Footer store={store} categories={categories} />
        <script
          type="application/ld+json"
           
          dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationLd(loaded)) }}
        />
      </div>
    </CartProvider>
  );
}

export const dynamic = 'force-dynamic';

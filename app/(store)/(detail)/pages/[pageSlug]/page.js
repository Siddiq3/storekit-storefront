import { notFound } from 'next/navigation';
import { StateScreen } from '@/components/StateScreen.jsx';
import { isApiError } from '@/lib/errors.js';
import { loadStoreOrState } from '@/lib/load.js';
import { getPage } from '@/lib/store-data.js';
import { pageMetadata, truncate } from '@/lib/seo.js';

export async function generateMetadata({ params }) {
  const loaded = await loadStoreOrState();
  if (!loaded.ok) return {};
  try {
    const page = await getPage(loaded.ctx.slug, loaded.ctx, (await params).pageSlug);
    return pageMetadata({ ...loaded, path: `/pages/${page.slug}`, title: `${page.title} — ${loaded.store.name}`, description: truncate(page.body) });
  } catch {
    return { title: 'Not found', robots: { index: false, follow: false } };
  }
}

/** An owner's own page — shipping, refunds, about. The body is plain text: it is shown as text, never as markup. */
export default async function StorePage({ params }) {
  const loaded = await loadStoreOrState();
  if (!loaded.ok) return null;
  const { ctx } = loaded;

  let page;
  try {
    page = await getPage(ctx.slug, ctx, (await params).pageSlug);
  } catch (error) {
    if (isApiError(error)) {
      if (!error.unavailable) notFound();
      return <StateScreen kind="unavailable" />;
    }
    throw error;
  }

  return (
    <article style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 20 }}>{page.title}</h1>
      <div className="sk-desc" style={{ color: 'inherit' }}>{page.body}</div>
    </article>
  );
}

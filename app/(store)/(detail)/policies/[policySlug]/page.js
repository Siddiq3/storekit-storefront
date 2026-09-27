import { notFound } from 'next/navigation';
import { PolicyContent } from '@/components/PolicyContent.jsx';
import { StateScreen } from '@/components/StateScreen.jsx';
import { isApiError } from '@/lib/errors.js';
import { loadStoreOrState } from '@/lib/load.js';
import { getPolicy } from '@/lib/store-data.js';
import { pageMetadata, truncate } from '@/lib/seo.js';

export async function generateMetadata({ params }) {
  const loaded = await loadStoreOrState();
  if (!loaded.ok) return {};
  try {
    const policy = await getPolicy(loaded.ctx.slug, loaded.ctx, (await params).policySlug);
    return pageMetadata({ ...loaded, path: `/policies/${policy.slug}`, title: `${policy.title} — ${loaded.store.name}`, description: truncate(policy.content) });
  } catch {
    // A hidden or unknown policy is never indexed.
    return { title: 'Not found', robots: { index: false, follow: false } };
  }
}

/**
 * A policy at its own address: what a shared link, a search result, a new tab or a browser
 * without scripts opens. Inside the store, PolicyLink shows the same PolicyContent in a dialog.
 */
export default async function PolicyPage({ params }) {
  const loaded = await loadStoreOrState();
  if (!loaded.ok) return null;
  const { ctx } = loaded;

  let policy;
  try {
    policy = await getPolicy(ctx.slug, ctx, (await params).policySlug);
  } catch (error) {
    if (isApiError(error)) {
      if (!error.unavailable) notFound();
      return <StateScreen kind="unavailable" />;
    }
    throw error;
  }

  return <div className="sk-policy-page"><PolicyContent policy={policy} /></div>;
}

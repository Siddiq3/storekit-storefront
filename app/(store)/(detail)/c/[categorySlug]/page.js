import { permanentRedirect } from 'next/navigation';

// The shared URL builders (and any link already sent out) use /c/<slug>; the canonical address is /category/<slug>.
export default async function LegacyCategory({ params }) {
  const { categorySlug } = await params;
  permanentRedirect(`/category/${encodeURIComponent(categorySlug)}`);
}

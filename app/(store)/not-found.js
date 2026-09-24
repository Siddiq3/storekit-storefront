import { StateScreen } from '@/components/StateScreen.jsx';

export const metadata = { title: 'Not found', robots: { index: false, follow: false } };

export default function StoreNotFound() {
  return <StateScreen kind="product-not-found" title="We could not find that" message="It may have been removed, or the link may be wrong." homeLink />;
}

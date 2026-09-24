import { CartView } from '@/components/CartView.jsx';
import { loadStoreOrState } from '@/lib/load.js';
import { noindex } from '@/lib/seo.js';

export const metadata = noindex('Your cart');

export default async function CartPage() {
  const loaded = await loadStoreOrState();
  if (!loaded.ok) return null;
  const { store } = loaded;
  return <CartView orderingPaused={store.orderingPaused} pausedMessage={store.orderingPausedMessage} />;
}

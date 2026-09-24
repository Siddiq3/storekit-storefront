import { OrderView } from '@/components/OrderView.jsx';
import { StateScreen } from '@/components/StateScreen.jsx';
import { loadOrder } from '@/lib/order-page.js';
import { noindex } from '@/lib/seo.js';

export const metadata = noindex('Order placed');

export default async function OrderSuccess({ searchParams }) {
  const result = await loadOrder(searchParams);
  if (!result) return null;
  if (result.state === 'unavailable') return <StateScreen kind="unavailable" />;
  return <OrderView order={result.order} token={result.token} placed />;
}

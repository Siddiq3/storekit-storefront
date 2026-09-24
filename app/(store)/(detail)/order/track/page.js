import { OrderView } from '@/components/OrderView.jsx';
import { StateScreen } from '@/components/StateScreen.jsx';
import { loadOrder } from '@/lib/order-page.js';
import { noindex } from '@/lib/seo.js';

// The address the API's tracking links use (`trackingUrl` in the shared package).
export const metadata = noindex('Your order');

export default async function OrderTrack({ searchParams }) {
  const result = await loadOrder(searchParams);
  if (!result) return null;
  if (result.state === 'unavailable') return <StateScreen kind="unavailable" />;
  return <OrderView order={result.order} token={result.token} placed={false} />;
}

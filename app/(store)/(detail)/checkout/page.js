import { CheckoutForm } from '@/components/CheckoutForm.jsx';
import { StateScreen } from '@/components/StateScreen.jsx';
import { loadStoreOrState } from '@/lib/load.js';
import { getSettings } from '@/lib/store-data.js';
import { noindex } from '@/lib/seo.js';

export const metadata = noindex('Checkout');

export default async function CheckoutPage() {
  const loaded = await loadStoreOrState();
  if (!loaded.ok) return null;
  const { store, ctx } = loaded;

  // Which payment methods are on is read from the API, and only COD and UPI_MANUAL exist there.
  let settings;
  try {
    settings = await getSettings(ctx.slug, ctx);
  } catch {
    return <StateScreen kind="unavailable" />;
  }

  return (
    <CheckoutForm
      paymentMethods={(settings.paymentMethods ?? []).filter((m) => m === 'COD' || m === 'UPI_MANUAL')}
      orderingPaused={Boolean(settings.orderingPaused ?? store.orderingPaused)}
      pausedMessage={settings.orderingPausedMessage ?? store.orderingPausedMessage}
    />
  );
}

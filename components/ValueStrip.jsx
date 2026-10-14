'use client';

import { useAvailablePaymentMethods } from './PaymentAvailability.jsx';
import { CashIcon, ReturnIcon, ShieldIcon, TruckIcon } from './icons.jsx';
import { returnsLabel } from '@/lib/returns.js';
import { money } from '@/lib/money.js';

/**
 * What the shop actually offers, drawn from the store's own settings: cash on delivery marked unavailable when off, free
 * delivery only if the delivery rule says so, and only the payment methods that exist (COD and UPI). Nothing is claimed
 * that the checkout cannot do.
 */
export function ValueStrip({ store }) {
  const methods = useAvailablePaymentMethods(store.paymentMethods);
  const cod = methods.includes('COD');
  const upi = methods.includes('UPI_MANUAL');
  const { freeDeliveryAlways, freeDeliveryAbove } = store.delivery ?? {};
  const shipping = freeDeliveryAlways
    ? { title: 'Free Shipping', text: 'Free delivery on every order.' }
    : freeDeliveryAbove > 0
      ? { title: 'Free Shipping', text: `Free delivery on orders of ${money(freeDeliveryAbove)} or more.` }
      : null;

  return (
    <section className="sk-values" aria-label="Shopping with us">
      <div className="sk-value" data-unavailable={!cod || undefined}><span className="sk-value-icon"><CashIcon /></span><strong>Cash On Delivery</strong><span>{cod ? 'You can choose to pay after you receive your order.' : 'Currently not accepted by this store.'}</span></div>
      {shipping ? <div className="sk-value"><span className="sk-value-icon"><TruckIcon /></span><strong>{shipping.title}</strong><span>{shipping.text}</span></div> : null}
      {upi ? <div className="sk-value"><span className="sk-value-icon"><ShieldIcon /></span><strong>Pay by UPI</strong><span>Pay with any UPI app, then share your payment reference.</span></div> : null}
      {store.returns?.allowed ? <div className="sk-value"><span className="sk-value-icon"><ReturnIcon /></span><strong>Easy Returns</strong><span>{returnsLabel(store.returns)}.</span></div> : null}
    </section>
  );
}

/**
 * The same facts, short, beside the buy button on a product page: what paying and delivery will be like, before the
 * shopper has to scroll to the strip at the foot of the page. Unavailable COD is explicit; enabled methods remain the only ones advertised as accepted.
 */
export function BuyPerks({ store }) {
  const methods = useAvailablePaymentMethods(store.paymentMethods);
  const cod = methods.includes('COD');
  const upi = methods.includes('UPI_MANUAL');
  const { freeDeliveryAlways, freeDeliveryAbove } = store.delivery ?? {};
  const items = [
    freeDeliveryAlways ? { icon: <TruckIcon />, text: 'Free delivery on every order' }
      : freeDeliveryAbove > 0 ? { icon: <TruckIcon />, text: `Free delivery on orders of ${money(freeDeliveryAbove)} or more` } : null,
    { icon: <CashIcon />, text: cod ? 'Cash on delivery available' : 'Cash on delivery is currently not accepted' },
    upi ? { icon: <ShieldIcon />, text: 'Pay with any UPI app' } : null,
  ].filter(Boolean);
  if (!items.length) return null;
  return (
    <ul className="sk-perks" aria-label="Delivery and payment">
      {items.map((item) => <li key={item.text}><span className="sk-perk-icon">{item.icon}</span>{item.text}</li>)}
    </ul>
  );
}

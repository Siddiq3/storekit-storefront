import { CashIcon, ShieldIcon, TruckIcon } from './icons.jsx';
import { money } from '@/lib/money.js';

/**
 * What the shop actually offers, drawn from the store's own settings: cash on delivery only if it is on, free
 * delivery only if the delivery rule says so, and only the payment methods that exist (COD and UPI). Nothing is claimed
 * that the checkout cannot do.
 */
export function ValueStrip({ store }) {
  const cod = store.paymentMethods.includes('COD');
  const upi = store.paymentMethods.includes('UPI_MANUAL');
  const { mode, freeAboveSubtotal } = store.delivery ?? {};
  const shipping = mode === 'free'
    ? { title: 'Free Shipping', text: 'Free delivery on every order.' }
    : mode === 'free_above' && freeAboveSubtotal > 0
      ? { title: 'Free Shipping', text: `Free delivery on orders of ${money(freeAboveSubtotal)} or more.` }
      : null;

  if (!cod && !upi && !shipping) return null;
  return (
    <section className="sk-values" aria-label="Shopping with us">
      {cod ? <div className="sk-value"><span className="sk-value-icon"><CashIcon /></span><strong>Cash On Delivery</strong><span>You can choose to pay after you receive your order.</span></div> : null}
      {shipping ? <div className="sk-value"><span className="sk-value-icon"><TruckIcon /></span><strong>{shipping.title}</strong><span>{shipping.text}</span></div> : null}
      {upi ? <div className="sk-value"><span className="sk-value-icon"><ShieldIcon /></span><strong>Pay by UPI</strong><span>Pay with any UPI app, then share your payment reference.</span></div> : null}
      {cod || upi ? (
        <div className="sk-accept">
          <strong>We accept:</strong>
          <div className="sk-chips">
            {cod ? <span className="sk-chip-pay">CASH ON DELIVERY</span> : null}
            {upi ? <span className="sk-chip-pay">UPI</span> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

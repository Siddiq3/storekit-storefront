import { money } from '@/lib/money.js';

/**
 * The server's quote, broken down the way Indian shoppers expect to read it: the MRP of everything, what the shop
 * took off it, the coupon, delivery, then the total and the saving. `subtotal` is already at selling prices and
 * `itemDiscount` is what those are below MRP, so their sum is the MRP total.
 */
export function PriceDetails({ quote, count, delivery }) {
  const saved = (quote.itemDiscount ?? 0) + (quote.couponDiscount ?? 0);
  return (
    <dl className="sk-totals" aria-live="polite">
      <div className="sk-totals-head"><dt>Price details ({count} {count === 1 ? 'item' : 'items'})</dt><dd /></div>
      <div><dt>Total MRP</dt><dd>{money(quote.subtotal + (quote.itemDiscount ?? 0))}</dd></div>
      {quote.itemDiscount > 0 ? <div><dt>Discount on MRP</dt><dd className="sk-minus">−{money(quote.itemDiscount)}</dd></div> : null}
      {quote.couponDiscount > 0 ? <div><dt>Coupon{quote.coupon?.code ? ` (${quote.coupon.code})` : ''}</dt><dd className="sk-minus">−{money(quote.couponDiscount)}</dd></div> : null}
      <div>
        <dt>{delivery?.name ?? 'Delivery'}</dt>
        <dd className={(delivery ? delivery.fee : quote.deliveryFee) > 0 ? undefined : 'sk-minus'}>{(delivery ? delivery.fee : quote.deliveryFee) > 0 ? money(delivery ? delivery.fee : quote.deliveryFee) : 'Free'}</dd>
      </div>
      <div className="sk-total"><dt>Total amount</dt><dd>{money(quote.total)}</dd></div>
      {saved > 0 ? <p className="sk-saved">You save {money(saved)} on this order</p> : null}
    </dl>
  );
}

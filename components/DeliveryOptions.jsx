import { money } from '@/lib/money.js';

/**
 * The store's delivery methods, as the server priced them for this cart and address. Nothing here is a price of its
 * own: the fee, the estimate and whether a method can deliver all come from the quote.
 */
export function DeliveryOptions({ options, selectedId, onSelect }) {
  if (!options?.length) return null;
  return (
    <fieldset className="sk-panel" style={{ margin: '0 0 16px' }}>
      <legend className="sk-visually-hidden">Delivery method</legend>
      <h2>Delivery</h2>
      {options.map((o) => (
        <label className="sk-radio sk-delivery-option" key={o.id} aria-disabled={o.deliverable ? undefined : 'true'}>
          <input type="radio" name="deliveryMethod" value={o.id} checked={selectedId === o.id} disabled={!o.deliverable} onChange={() => onSelect(o.id)} />
          <span className="sk-delivery-body">
            <span className="sk-delivery-head">
              <strong>{o.name}</strong>
              <strong>{deliveryPrice(o)}</strong>
            </span>
            {o.description ? <span className="sk-hint">{o.description}</span> : null}
            {o.deliverable && o.estimate ? <span className="sk-hint">{o.estimate.label}</span> : null}
            {!o.deliverable ? <span className="sk-error">{o.message}</span> : null}
            {o.deliverable && o.dependsOnPincode ? <span className="sk-hint">Final charge depends on your pincode.</span> : null}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/** "Free" or the amount, as priced by the server. */
export const deliveryPrice = (option) => (option.fee > 0 ? money(option.fee) : 'Free');

/**
 * "Add ₹149 more for FREE delivery" until the order reaches the method's threshold, then "FREE delivery unlocked".
 * The amounts are the server's; the bar only shows how far along the order is.
 */
export function FreeDeliveryProgress({ quote }) {
  if (!quote) return null;
  if (quote.freeDeliveryUnlocked) {
    return <p className="sk-free-delivery sk-free-delivery-done" role="status">FREE delivery unlocked</p>;
  }
  if (!(quote.freeDeliveryRemaining > 0)) return null;
  const spent = Math.max(0, quote.subtotal - (quote.couponDiscount ?? 0));
  const target = spent + quote.freeDeliveryRemaining;
  const percent = Math.min(100, Math.round((spent / target) * 100));
  return (
    <div className="sk-free-delivery" role="status">
      <p style={{ margin: 0 }}>Add <strong>{money(quote.freeDeliveryRemaining)}</strong> more for <strong>FREE</strong> delivery</p>
      <div className="sk-free-delivery-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Progress towards free delivery">
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

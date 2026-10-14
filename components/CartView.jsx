'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from './CartProvider.jsx';
import { readCoupon, useQuote, writeCoupon } from './useQuote.js';
import { lineKey } from '@/lib/cart.js';
import { money } from '@/lib/money.js';
import { productPath } from '@/lib/urls.js';
import { FreeDeliveryProgress } from './DeliveryOptions.jsx';
import { Initial } from './Initial.jsx';
import { PriceDetails } from './PriceDetails.jsx';
import { offerValue, offerTerms } from './Offers.jsx';
import { BagIcon, TagIcon } from './icons.jsx';

const ISSUES = {
  unavailable: () => 'This item is no longer available. Remove it to continue.',
  out_of_stock: () => 'Sold out. Remove it to continue.',
  insufficient_stock: (line) => `Only ${line.accepted} available.`,
};

export function CartView({ orderingPaused, pausedMessage, offers = [] }) {
  const cart = useCart();
  const [coupon, setCoupon] = useState('');
  const [entered, setEntered] = useState('');
  useEffect(() => { const saved = readCoupon(); setCoupon(saved); setEntered(saved); }, []);

  const { status, quote, error, refresh } = useQuote({ lines: cart.lines, ready: cart.ready, couponCode: coupon });

  if (!cart.ready) return <div className="sk-skeleton" style={{ height: 160 }} aria-busy="true" aria-label="Loading your cart" />;

  if (cart.lines.length === 0) {
    return (
      <div className="sk-empty sk-empty-cart" role="status">
        <span className="sk-empty-icon"><BagIcon /></span>
        <h1>Your cart is empty</h1>
        <p>Add something you like and it will wait for you here.</p>
        <Link className="sk-button" href="/products">Start shopping</Link>
      </div>
    );
  }

  const applyCoupon = (event) => {
    event.preventDefault();
    const code = entered.trim().toUpperCase();
    setCoupon(code);
    writeCoupon(code);
  };
  const removeCoupon = () => { setCoupon(''); setEntered(''); writeCoupon(''); };
  const applyOffer = (code) => { setEntered(code); setCoupon(code); writeCoupon(code); };

  const priced = new Map((quote?.lines ?? []).map((l) => [lineKey(l), l]));
  const problem = (quote?.lines ?? []).some((l) => l.issue);
  const canCheckout = status === 'ready' && !problem && !orderingPaused && quote?.lines?.length > 0;

  return (
    <div className="sk-two">
      <div>
        <h1 className="sk-page-title">Your cart <span>{cart.count} {cart.count === 1 ? 'item' : 'items'}</span></h1>
        {orderingPaused ? <p className="sk-notice" role="status">{pausedMessage || 'This shop is not taking orders right now.'}</p> : null}
        {status === 'error' ? (
          <p className="sk-alert" role="alert">{error?.message} <button type="button" className="sk-link-button" onClick={refresh}>Try again</button></p>
        ) : null}
        <ul className="sk-lines">
          {cart.lines.map((line) => {
            const key = lineKey(line);
            const p = priced.get(key);
            const issue = p?.issue ? ISSUES[p.issue]?.(p) ?? 'Please review this item.' : null;
            return (
              <li className="sk-line" key={key}>
                {(p?.imageUrl ?? line.imageUrl) ? <img src={p?.imageUrl ?? line.imageUrl} alt="" width="72" height="72" loading="lazy" /> : <span className="sk-line-photo sk-no-photo"><Initial name={p?.name ?? line.name} /></span>}
                <div>
                  <Link className="sk-line-name" href={productPath({ productId: line.productId, slug: line.slug })} prefetch={false}>{p?.name ?? line.name}</Link>
                  {(p?.variantLabel ?? line.variantLabel) ? <div className="sk-hint">{p?.variantLabel ?? line.variantLabel}</div> : null}
                  <div><span className="sk-price">{money(p?.unitPrice ?? line.unitPrice)}</span>{p?.mrp > p?.unitPrice ? <span className="sk-mrp">{money(p.mrp)}</span> : null}</div>
                  {issue ? <p className="sk-error" role="alert">{issue}{p?.issue === 'insufficient_stock' && p.accepted > 0 ? <> <button type="button" className="sk-link-button" onClick={() => cart.setQuantity(key, p.accepted)}>Use {p.accepted}</button></> : null}</p> : null}
                  <div className="sk-line-actions">
                    <div className="sk-qty" role="group" aria-label={`Quantity of ${line.name}`}>
                      <button type="button" aria-label="Decrease quantity" onClick={() => (line.quantity > 1 ? cart.setQuantity(key, line.quantity - 1) : cart.remove(key))}>−</button>
                      <output>{line.quantity}</output>
                      <button type="button" aria-label="Increase quantity" onClick={() => cart.setQuantity(key, line.quantity + 1)}>+</button>
                    </div>
                    <button type="button" className="sk-link-button" onClick={() => cart.remove(key)}>Remove</button>
                    {p ? <strong className="sk-line-total">{money(p.lineTotal)}</strong> : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <aside className="sk-panel sk-summary" aria-label="Order summary">
        <form onSubmit={applyCoupon} className="sk-field sk-coupon">
          <label htmlFor="sk-coupon"><TagIcon /> Apply coupon</label>
          <div className="sk-coupon-row">
            <input id="sk-coupon" value={entered} onChange={(e) => setEntered(e.target.value)} maxLength={30} autoCapitalize="characters" autoComplete="off" placeholder="Enter code" />
            <button type="submit" className="sk-button sk-button-quiet">Apply</button>
          </div>
          {quote?.couponError?.message ? <span className="sk-error" role="alert">{quote.couponError.message}</span> : null}
        </form>
        {quote?.coupon ? <p className="sk-coupon-applied" role="status"><strong>{quote.coupon.code}</strong> applied <button type="button" className="sk-link-button" onClick={removeCoupon}>Remove</button></p> : null}
        {!quote?.coupon && offers.length ? (
          <ul className="sk-coupon-offers" aria-label="Offers you can apply">
            {offers.slice(0, 3).map((offer) => (
              <li key={offer.code}>
                <span><strong>{offer.code}</strong> {offerValue(offer)}<br /><span className="sk-hint">{offerTerms(offer)}</span></span>
                <button type="button" className="sk-link-button sk-apply" onClick={() => applyOffer(offer.code)} aria-label={`Apply ${offer.code}`}>Apply</button>
              </li>
            ))}
          </ul>
        ) : null}

        {quote ? (
          <>
            <PriceDetails quote={quote} count={cart.count} />
            {quote.deliveryOptions?.some((o) => o.dependsOnPincode) ? <p className="sk-hint">Final delivery charge depends on your pincode.</p> : null}
            {quote.deliveryEstimate ? <p className="sk-hint">{quote.deliveryEstimate.label}</p> : null}
            <FreeDeliveryProgress quote={quote} />
          </>
        ) : <div className="sk-skeleton" style={{ height: 160 }} aria-busy="true" />}

        <div className="sk-paybar">
          {quote ? <span className="sk-paybar-total"><strong>{money(quote.total)}</strong><span>Total</span></span> : null}
          {canCheckout
            ? <Link className="sk-button sk-button-block" href="/checkout">Checkout</Link>
            : <button type="button" className="sk-button sk-button-block" disabled>Checkout</button>}
        </div>
      </aside>
    </div>
  );
}

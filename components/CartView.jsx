'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from './CartProvider.jsx';
import { readCoupon, useQuote, writeCoupon } from './useQuote.js';
import { lineKey } from '@/lib/cart.js';
import { money } from '@/lib/money.js';
import { productPath } from '@/lib/urls.js';

const ISSUES = {
  unavailable: () => 'This item is no longer available. Remove it to continue.',
  out_of_stock: () => 'Sold out. Remove it to continue.',
  insufficient_stock: (line) => `Only ${line.accepted} available.`,
};

export function CartView({ orderingPaused, pausedMessage }) {
  const cart = useCart();
  const [coupon, setCoupon] = useState('');
  const [entered, setEntered] = useState('');
  useEffect(() => { const saved = readCoupon(); setCoupon(saved); setEntered(saved); }, []);

  const { status, quote, error, refresh } = useQuote({ lines: cart.lines, ready: cart.ready, couponCode: coupon });

  if (!cart.ready) return <div className="sk-skeleton" style={{ height: 160 }} aria-busy="true" aria-label="Loading your cart" />;

  if (cart.lines.length === 0) {
    return (
      <div className="sk-empty" role="status">
        <p>Your cart is empty.</p>
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

  const priced = new Map((quote?.lines ?? []).map((l) => [lineKey(l), l]));
  const problem = (quote?.lines ?? []).some((l) => l.issue);
  const canCheckout = status === 'ready' && !problem && !orderingPaused && quote?.lines?.length > 0;

  return (
    <div className="sk-two">
      <div>
        <h1 style={{ marginBottom: 16 }}>Your cart</h1>
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
                {(p?.imageUrl ?? line.imageUrl) ? <img src={p?.imageUrl ?? line.imageUrl} alt="" width="72" height="72" loading="lazy" /> : <div className="sk-skeleton" style={{ width: 72, height: 72 }} />}
                <div>
                  <Link className="sk-line-name" href={productPath({ productId: line.productId, slug: line.slug })}>{p?.name ?? line.name}</Link>
                  {(p?.variantLabel ?? line.variantLabel) ? <div className="sk-hint">{p?.variantLabel ?? line.variantLabel}</div> : null}
                  <div><span className="sk-price">{money(p?.unitPrice ?? line.unitPrice)}</span>{p?.mrp > p?.unitPrice ? <span className="sk-mrp">{money(p.mrp)}</span> : null}</div>
                  {issue ? <p className="sk-error" role="alert">{issue}{p?.issue === 'insufficient_stock' && p.accepted > 0 ? <> <button type="button" className="sk-link-button" onClick={() => cart.setQuantity(key, p.accepted)}>Use {p.accepted}</button></> : null}</p> : null}
                  <div className="sk-line-actions">
                    <div className="sk-qty" role="group" aria-label={`Quantity of ${line.name}`}>
                      <button type="button" aria-label="Decrease quantity" onClick={() => (line.quantity > 1 ? cart.setQuantity(key, line.quantity - 1) : cart.remove(key))}>−</button>
                      <output>{line.quantity}</output>
                      <button type="button" aria-label="Increase quantity" onClick={() => cart.setQuantity(key, line.quantity + 1)}>+</button>
                    </div>
                    {p ? <strong>{money(p.lineTotal)}</strong> : null}
                    <button type="button" className="sk-link-button" onClick={() => cart.remove(key)}>Remove</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <aside className="sk-panel" aria-label="Order summary">
        <h2>Summary</h2>
        <form onSubmit={applyCoupon} className="sk-field">
          <label htmlFor="sk-coupon">Coupon code</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input id="sk-coupon" value={entered} onChange={(e) => setEntered(e.target.value)} maxLength={30} autoCapitalize="characters" autoComplete="off" />
            <button type="submit" className="sk-button sk-button-quiet">Apply</button>
          </div>
          {quote?.couponError?.message ? <span className="sk-error" role="alert">{quote.couponError.message}</span> : null}
        </form>
        {quote?.coupon ? <p className="sk-hint">Coupon {quote.coupon.code} applied. <button type="button" className="sk-link-button" onClick={removeCoupon}>Remove</button></p> : null}

        {quote ? (
          <dl className="sk-totals" aria-live="polite">
            <div><dt>Subtotal</dt><dd>{money(quote.subtotal)}</dd></div>
            {quote.couponDiscount > 0 ? <div><dt>Coupon</dt><dd>−{money(quote.couponDiscount)}</dd></div> : null}
            <div><dt>Delivery</dt><dd>{quote.deliveryFee > 0 ? money(quote.deliveryFee) : 'Free'}</dd></div>
            {quote.deliveryMessage ? <p className="sk-hint" style={{ margin: 0 }}>{quote.deliveryMessage}</p> : null}
            <div className="sk-total"><dt>Total</dt><dd>{money(quote.total)}</dd></div>
            {quote.itemDiscount > 0 ? <p className="sk-off" style={{ margin: 0 }}>You save {money(quote.itemDiscount + quote.couponDiscount)}</p> : null}
          </dl>
        ) : <div className="sk-skeleton" style={{ height: 120 }} aria-busy="true" />}

        {canCheckout
          ? <Link className="sk-button sk-button-block" href="/checkout" style={{ marginTop: 16 }}>Checkout</Link>
          : <button type="button" className="sk-button sk-button-block" style={{ marginTop: 16 }} disabled>Checkout</button>}
      </aside>
    </div>
  );
}

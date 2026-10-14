'use client';

import { useState } from 'react';
import { money } from '@/lib/money.js';

export function Offers({ offers = [] }) {
  const [message, setMessage] = useState('');
  if (!offers.length) return null;
  const copy = async (code) => {
    try {
      await window.navigator.clipboard.writeText(code);
      setMessage(`${code} copied. Enter it at checkout.`);
    } catch { setMessage(`Enter ${code} at checkout.`); }
  };
  return <section className="sk-section sk-offers" aria-labelledby="sec-offers">
    <div className="sk-section-head"><h2 id="sec-offers">Offers for you</h2><span className="sk-hint">Use a code at checkout</span></div>
    <div className="sk-offer-grid">{offers.map((offer) => <article className="sk-offer" key={offer.code}>
      <span className="sk-offer-eyebrow">{offer.scope === 'all' ? 'Store offer' : 'Selected items'}</span>
      <h3>{offer.type === 'percentage' ? `${offer.value}% off` : `${money(offer.value)} off`}</h3>
      {offer.description ? <p>{offer.description}</p> : null}
      <div className="sk-offer-terms">
        {offer.minOrderValue > 0 ? <span>Orders from {money(offer.minOrderValue)}</span> : null}
        {offer.maxDiscount > 0 ? <span>Save up to {money(offer.maxDiscount)}</span> : null}
        {offer.expiresAt ? <span>Ends {new Date(offer.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}</span> : null}
        <span>Eligibility checked at checkout</span>
      </div>
      <button type="button" className="sk-offer-code" aria-label={`Copy coupon ${offer.code}`} onClick={() => copy(offer.code)}><strong>{offer.code}</strong><span>Copy code</span></button>
    </article>)}</div>
    <p className="sk-hint sk-offer-feedback" role="status">{message}</p>
  </section>;
}

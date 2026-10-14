'use client';

import { useState } from 'react';
import { money } from '@/lib/money.js';
import { CheckIcon, CopyIcon, TagIcon } from './icons.jsx';

const ends = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
export const offerValue = (offer) => (offer.type === 'percentage' ? `${offer.value}% off` : `${money(offer.value)} off`);
export const offerTerms = (offer) => [
  offer.minOrderValue > 0 ? `On orders of ${money(offer.minOrderValue)}+` : 'On any order',
  offer.maxDiscount > 0 ? `up to ${money(offer.maxDiscount)}` : null,
  offer.expiresAt ? `ends ${ends(offer.expiresAt)}` : null,
].filter(Boolean).join(' · ');

/** The owner's advertised coupons as tear-off tickets in a row that scrolls sideways; tapping one copies its code. */
export function Offers({ offers = [] }) {
  const [copied, setCopied] = useState('');
  const [message, setMessage] = useState('');
  if (!offers.length) return null;
  const copy = async (code) => {
    try {
      await window.navigator.clipboard.writeText(code);
      setCopied(code);
      setMessage(`${code} copied. Enter it at checkout.`);
    } catch { setMessage(`Enter ${code} at checkout.`); }
  };
  return <section className="sk-section sk-offers" aria-labelledby="sec-offers">
    <div className="sk-section-head"><h2 id="sec-offers">Offers for you</h2><span className="sk-hint">Eligibility checked at checkout</span></div>
    <ul className="sk-offer-rail">{offers.map((offer) => <li className="sk-offer" key={offer.code}>
      <div className="sk-offer-value"><strong>{offerValue(offer)}</strong><span>{offer.scope === 'all' ? 'Storewide' : 'Selected items'}</span></div>
      <div className="sk-offer-body">
        {offer.description ? <p className="sk-offer-desc">{offer.description}</p> : null}
        <p className="sk-offer-terms">{offerTerms(offer)}</p>
        <button type="button" className="sk-offer-code" aria-label={`Copy coupon ${offer.code}`} onClick={() => copy(offer.code)}>
          <strong>{offer.code}</strong>
          <span>{copied === offer.code ? <><CheckIcon /> Copied</> : <><CopyIcon /><span className="sk-copy-label">Copy code</span></>}</span>
        </button>
      </div>
    </li>)}</ul>
    <p className="sk-visually-hidden" role="status">{message}</p>
  </section>;
}

/** The same offers as a short list beside the buy button: what a code takes off, and the code to use. */
export function OfferList({ offers = [] }) {
  if (!offers.length) return null;
  return <section className="sk-offer-list" aria-labelledby="sk-h-offers">
    <h2 id="sk-h-offers">Available offers</h2>
    <ul>{offers.slice(0, 3).map((offer) => <li key={offer.code}>
      <TagIcon />
      <span><strong>{offerValue(offer)}</strong> {offerTerms(offer).replace(/^On/, 'on')}. Use <strong className="sk-code">{offer.code}</strong></span>
    </li>)}</ul>
  </section>;
}

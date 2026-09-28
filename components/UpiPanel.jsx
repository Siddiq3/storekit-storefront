'use client';

import { useEffect, useState } from 'react';
import { loadUpi } from '@/lib/checkout.js';
import { postJson } from '@/lib/client-api.js';
import { money } from '@/lib/money.js';

/** Copies the UPI ID, for a shopper paying from another phone or typing it into their app. */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = async () => {
    try { await window.navigator.clipboard.writeText(text); setCopied(true); } catch { /* no clipboard: the ID stays visible to copy by hand */ }
  };
  return <button type="button" className="sk-copy" onClick={copy} aria-label={`Copy UPI ID ${text}`}>{copied ? 'Copied ✓' : 'Copy'}</button>;
}

/**
 * Who to pay and how: the amount, the owner's own QR to scan when they uploaded one, the UPI ID (with a copy
 * button) and the payment link that opens a UPI app on a phone.
 */
export function UpiDetails({ upi }) {
  return (
    <div className="sk-upi">
      <p className="sk-upi-amount">Pay <strong>{money(upi.amount)}</strong>{upi.payeeName ? <> to <strong>{upi.payeeName}</strong></> : null}</p>
      {upi.qrImageUrl ? (
        <figure className="sk-upi-qr">
          <img src={upi.qrImageUrl} alt={`UPI QR code for ${upi.payeeName || upi.upiId}`} width="200" height="200" />
          <figcaption className="sk-hint">Scan with any UPI app to pay.</figcaption>
        </figure>
      ) : null}
      <div className="sk-upi-id">
        <span className="sk-hint">UPI ID</span>
        <strong className="sk-mono">{upi.upiId}</strong>
        <CopyButton text={upi.upiId} />
      </div>
      {upi.deepLink ? <a className="sk-button sk-button-block" href={upi.deepLink}>Open my UPI app</a> : null}
    </div>
  );
}

/**
 * Paying by UPI: the details the API returned when the order was placed (kept for this tab), then the payment
 * reference the shopper sends back. Only the tracking token identifies the order; the internal id stays server-side.
 */
export function UpiPanel({ token, awaiting, contact }) {
  const [upi, setUpi] = useState(null);
  const [utr, setUtr] = useState('');
  const [state, setState] = useState({ status: 'idle', message: null });

  useEffect(() => { setUpi(loadUpi(token)); }, [token]);

  if (!awaiting && state.status !== 'done') return null;

  if (state.status === 'done') {
    return (
      <div className="sk-panel sk-pay" role="status">
        <div className="sk-pay-head"><h2>Payment reference sent</h2><span className="sk-status" data-tone="pending">Waiting for the shop</span></div>
        <p style={{ margin: 0 }}><strong>Thank you.</strong> The shop will check your payment and confirm your order.</p>
      </div>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    setState({ status: 'sending', message: null });
    const result = await postJson('/api/orders/upi', { token, utr: utr.trim() });
    setState(result.ok ? { status: 'done', message: null } : { status: 'error', message: result.details?.[0]?.message ?? result.message });
  };

  return (
    <section className="sk-panel sk-pay" aria-labelledby="sk-upi-h">
      <div className="sk-pay-head">
        <h2 id="sk-upi-h">Pay by UPI</h2>
        <span className="sk-status" data-tone="pending">Payment pending</span>
      </div>
      {upi ? <UpiDetails upi={upi} /> : (
        <p className="sk-hint">
          The shop's UPI details were shown when you placed the order.
          {contact ? ` If you need them again, contact the shop${contact.phone ? ` on ${contact.phone}` : ''}.` : ''}
        </p>
      )}

      <form onSubmit={submit} className="sk-upi-form" noValidate>
        <div className="sk-field">
          <label htmlFor="sk-utr">UPI reference (UTR)</label>
          <input id="sk-utr" value={utr} onChange={(e) => setUtr(e.target.value)} maxLength={32} autoComplete="off" autoCapitalize="characters"
            aria-invalid={state.status === 'error' ? 'true' : undefined} aria-describedby="sk-utr-hint" />
          <span id="sk-utr-hint" className="sk-hint">After paying, copy the reference number from your UPI app and enter it here.</span>
          {state.status === 'error' ? <span className="sk-error" role="alert">{state.message}</span> : null}
        </div>
        <button type="submit" className="sk-button" disabled={state.status === 'sending' || utr.trim().length < 6}>
          {state.status === 'sending' ? 'Sending…' : 'Send payment reference'}
        </button>
      </form>
    </section>
  );
}

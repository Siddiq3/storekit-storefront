'use client';

import { useEffect, useState } from 'react';
import { loadUpi } from '@/lib/checkout.js';
import { postJson } from '@/lib/client-api.js';
import { money } from '@/lib/money.js';

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
    return <div className="sk-notice" role="status"><strong>Thank you.</strong> The shop will check your payment and confirm your order.</div>;
  }

  const submit = async (event) => {
    event.preventDefault();
    setState({ status: 'sending', message: null });
    const result = await postJson('/api/orders/upi', { token, utr: utr.trim() });
    setState(result.ok ? { status: 'done', message: null } : { status: 'error', message: result.details?.[0]?.message ?? result.message });
  };

  return (
    <section className="sk-panel" aria-labelledby="sk-upi-h">
      <h2 id="sk-upi-h">Pay by UPI</h2>
      {upi ? (
        <div className="sk-upi">
          <p style={{ margin: 0 }}>Pay <strong>{money(upi.amount)}</strong> to <strong className="sk-mono">{upi.upiId}</strong>{upi.payeeName ? ` (${upi.payeeName})` : ''}.</p>
          {upi.qrImageUrl ? <img src={upi.qrImageUrl} alt="UPI QR code" width="200" height="200" /> : null}
          {upi.deepLink ? <a className="sk-button" href={upi.deepLink}>Open my UPI app</a> : null}
        </div>
      ) : (
        <p className="sk-hint">
          The shop's UPI details were shown when you placed the order.
          {contact ? ` If you need them again, contact the shop${contact.phone ? ` on ${contact.phone}` : ''}.` : ''}
        </p>
      )}

      <form onSubmit={submit} style={{ marginTop: 16 }} noValidate>
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

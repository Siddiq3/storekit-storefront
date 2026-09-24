'use client';

import { useState } from 'react';
import { OrderView } from './OrderView.jsx';
import { postJson } from '@/lib/client-api.js';

/** Find an order without its link: the order number and the mobile number that was used to place it. */
export function TrackForm() {
  const [orderNumber, setOrderNumber] = useState('');
  const [mobile, setMobile] = useState('');
  const [state, setState] = useState({ status: 'idle' });

  const submit = async (event) => {
    event.preventDefault();
    setState({ status: 'loading' });
    const result = await postJson('/api/orders/lookup', { orderNumber: orderNumber.trim(), mobile: mobile.trim() });
    if (result.ok) setState({ status: 'found', order: result.data });
    else setState({ status: 'error', message: result.status === 404 ? 'We could not find an order with those details. Check the order number and mobile number.' : (result.details?.[0]?.message ?? result.message) });
  };

  if (state.status === 'found') {
    return (
      <div>
        <p><button type="button" className="sk-link-button" onClick={() => setState({ status: 'idle' })}>← Look up another order</button></p>
        <OrderView order={state.order} token={null} placed={false} />
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate style={{ maxWidth: 440, margin: '0 auto' }} aria-labelledby="sk-track-h">
      <h1 id="sk-track-h" style={{ marginBottom: 8 }}>Track your order</h1>
      <p className="sk-hint" style={{ marginBottom: 20 }}>Enter your order number and the mobile number you used when you ordered.</p>
      {state.status === 'error' ? <p className="sk-alert" role="alert">{state.message}</p> : null}
      <div className="sk-field">
        <label htmlFor="sk-on">Order number</label>
        <input id="sk-on" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="ORD-000123" autoCapitalize="characters" autoComplete="off" maxLength={14} />
      </div>
      <div className="sk-field">
        <label htmlFor="sk-mob">Mobile number</label>
        <input id="sk-mob" value={mobile} onChange={(e) => setMobile(e.target.value)} inputMode="tel" autoComplete="tel" maxLength={17} />
      </div>
      <button type="submit" className="sk-button sk-button-block" disabled={state.status === 'loading' || !orderNumber.trim() || !mobile.trim()}>
        {state.status === 'loading' ? 'Looking…' : 'Track order'}
      </button>
    </form>
  );
}

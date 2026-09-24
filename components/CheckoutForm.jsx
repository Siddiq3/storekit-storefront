'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useCart } from './CartProvider.jsx';
import { readCoupon, useQuote } from './useQuote.js';
import { emptyAddress, validateAddress, orderBody, idempotencyKeyFor, clearIdempotencyKey, saveUpi, saveAddress, loadAddress, clearAddress, PAYMENT_LABELS } from '@/lib/checkout.js';
import { postJson } from '@/lib/client-api.js';
import { toQuoteLines } from '@/lib/cart.js';
import { money } from '@/lib/money.js';

const FIELD_LABELS = {
  fullName: ['Full name', 'name'], mobile: ['Mobile number', 'tel'], houseNo: ['House / flat number', 'address-line1'],
  street: ['Street', 'address-line2'], area: ['Area', 'address-level3'], landmark: ['Landmark (optional)', 'off'],
  city: ['City', 'address-level2'], district: ['District', 'off'], state: ['State', 'address-level1'], pincode: ['Pincode', 'postal-code'],
};

function Field({ name, values, errors, onChange, inputMode, maxLength }) {
  const [label, autoComplete] = FIELD_LABELS[name];
  const id = `sk-${name}`;
  return (
    <div className="sk-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} name={name} value={values[name]} onChange={(e) => onChange(name, e.target.value)} autoComplete={autoComplete}
        inputMode={inputMode} maxLength={maxLength ?? 120} aria-invalid={errors[name] ? 'true' : undefined} aria-describedby={errors[name] ? `${id}-err` : undefined} />
      {errors[name] ? <span className="sk-error" id={`${id}-err`}>{errors[name]}</span> : null}
    </div>
  );
}

export function CheckoutForm({ paymentMethods, orderingPaused, pausedMessage }) {
  const router = useRouter();
  const cart = useCart();
  const [values, setValues] = useState(emptyAddress());
  const [errors, setErrors] = useState({});
  const [method, setMethod] = useState(paymentMethods[0] ?? '');
  const [coupon, setCoupon] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState(null);
  const [notice, setNotice] = useState(null);
  const alertRef = useRef(null);
  const [remember, setRemember] = useState(true);
  const [restored, setRestored] = useState(false);

  useEffect(() => { setCoupon(readCoupon()); }, []);

  // A returning shopper finds their details already filled in (kept on this device only; there is no account).
  useEffect(() => {
    const saved = loadAddress();
    if (saved) { setValues((v) => ({ ...v, ...saved, instructions: v.instructions })); setRestored(true); }
  }, []);

  const { status, quote, refresh } = useQuote({ lines: cart.lines, ready: cart.ready, couponCode: coupon, pincode: values.pincode, paymentMethod: method });

  useEffect(() => { if (failure) alertRef.current?.focus(); }, [failure]);

  const change = (name, value) => { setValues((v) => ({ ...v, [name]: value })); setErrors((e) => ({ ...e, [name]: undefined })); };

  if (!cart.ready) return <div className="sk-skeleton" style={{ height: 200 }} aria-busy="true" aria-label="Loading" />;
  if (cart.lines.length === 0) {
    return <div className="sk-empty" role="status"><p>Your cart is empty.</p><Link className="sk-button" href="/products">Start shopping</Link></div>;
  }
  if (orderingPaused) return <p className="sk-notice" role="status">{pausedMessage || 'This shop is not taking orders right now.'} <Link href="/cart">Back to cart</Link></p>;
  if (paymentMethods.length === 0) return <p className="sk-notice" role="status">This shop has not set up a way to pay yet. Please contact them directly.</p>;

  const problem = quote?.lines?.some((l) => l.issue);

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setFailure(null);
    setNotice(null);

    const checked = validateAddress(values);
    if (!checked.ok) {
      setErrors(checked.errors);
      setFailure({ message: 'Some details need attention. They are marked below.' });
      return;
    }
    if (status !== 'ready' || !quote || problem || quote.deliverable === false) {
      setFailure({ message: quote?.deliverable === false ? (quote.deliveryMessage || 'This shop does not deliver to that pincode.') : 'Please review your cart before placing the order.' });
      return;
    }

    const body = orderBody({ lines: toQuoteLines(cart.lines), address: checked.address, couponCode: coupon, paymentMethod: method, expectedTotal: quote.total });
    setSubmitting(true);
    const result = await postJson('/api/orders', body, { 'x-idempotency-key': idempotencyKeyFor(body) });

    if (result.ok) {
      const order = result.data;
      clearIdempotencyKey();
      if (remember) saveAddress(values); else clearAddress();
      if (order.upi) saveUpi(order.trackingToken, order.upi);
      cart.clear();
      router.push(`/order/success?t=${encodeURIComponent(order.trackingToken)}`);
      return;
    }

    setSubmitting(false);
    if (result.code === 'TOTAL_MISMATCH') {
      refresh();
      setNotice('Prices or delivery changed while you were checking out. Please look at the new total, then place your order again.');
      return;
    }
    const fieldErrors = {};
    for (const d of result.details) {
      const field = String(d.path ?? '').split('.').pop();
      if (field in FIELD_LABELS && !fieldErrors[field]) fieldErrors[field] = d.message;
    }
    if (Object.keys(fieldErrors).length) setErrors(fieldErrors);
    setFailure({ message: result.message });
  };

  return (
    <form onSubmit={submit} noValidate className="sk-two" aria-labelledby="sk-checkout-title">
      <div>
        <h1 id="sk-checkout-title" style={{ marginBottom: 16 }}>Checkout</h1>
        {failure ? <p className="sk-alert" role="alert" tabIndex={-1} ref={alertRef}>{failure.message}</p> : null}
        {notice ? <p className="sk-notice" role="status">{notice}</p> : null}

        <section className="sk-panel" aria-labelledby="sk-h-delivery" style={{ marginBottom: 16 }}>
          <h2 id="sk-h-delivery">Delivery details</h2>
          <div className="sk-form-row">
            <Field name="fullName" values={values} errors={errors} onChange={change} maxLength={80} />
            <Field name="mobile" values={values} errors={errors} onChange={change} inputMode="tel" maxLength={17} />
          </div>
          <div className="sk-form-row">
            <Field name="houseNo" values={values} errors={errors} onChange={change} maxLength={60} />
            <Field name="street" values={values} errors={errors} onChange={change} />
          </div>
          <div className="sk-form-row">
            <Field name="area" values={values} errors={errors} onChange={change} />
            <Field name="landmark" values={values} errors={errors} onChange={change} />
          </div>
          <div className="sk-form-row">
            <Field name="city" values={values} errors={errors} onChange={change} />
            <Field name="district" values={values} errors={errors} onChange={change} />
          </div>
          <div className="sk-form-row">
            <Field name="state" values={values} errors={errors} onChange={change} />
            <Field name="pincode" values={values} errors={errors} onChange={change} inputMode="numeric" maxLength={6} />
          </div>
          <div className="sk-field">
            <label htmlFor="sk-instructions">Delivery instructions (optional)</label>
            <textarea id="sk-instructions" rows={2} maxLength={300} value={values.instructions} onChange={(e) => change('instructions', e.target.value)} />
            {errors.instructions ? <span className="sk-error">{errors.instructions}</span> : null}
          </div>
        </section>

        <label className="sk-remember">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <span>Save these details on this device for next time</span>
        </label>
        {restored ? (
          <p className="sk-hint" role="status" style={{ marginTop: 0 }}>
            Filled in from your last order on this device.{' '}
            <button type="button" className="sk-link-button" onClick={() => { clearAddress(); setValues(emptyAddress()); setRestored(false); }}>Clear saved details</button>
          </p>
        ) : null}

        <fieldset className="sk-panel" style={{ margin: 0 }}>
          <legend className="sk-visually-hidden">Payment method</legend>
          <h2>Payment</h2>
          {paymentMethods.map((m) => (
            <label className="sk-radio" key={m}>
              <input type="radio" name="paymentMethod" value={m} checked={method === m} onChange={() => setMethod(m)} />
              <span><strong>{PAYMENT_LABELS[m]?.title ?? m}</strong><br /><span className="sk-hint">{PAYMENT_LABELS[m]?.hint}</span></span>
            </label>
          ))}
        </fieldset>
      </div>

      <aside className="sk-panel" aria-label="Order summary">
        <h2>Your order</h2>
        {quote ? (
          <>
            <ul className="sk-lines" style={{ marginBottom: 12 }}>
              {quote.lines.map((l) => (
                <li key={`${l.productId}:${l.variantId ?? ''}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span>{l.name}{l.variantLabel ? ` (${l.variantLabel})` : ''} × {l.accepted ?? l.requested}</span>
                  <span>{money(l.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="sk-totals" aria-live="polite">
              <div><dt>Subtotal</dt><dd>{money(quote.subtotal)}</dd></div>
              {quote.couponDiscount > 0 ? <div><dt>Coupon</dt><dd>−{money(quote.couponDiscount)}</dd></div> : null}
              <div><dt>Delivery</dt><dd>{quote.deliveryFee > 0 ? money(quote.deliveryFee) : 'Free'}</dd></div>
              {quote.deliveryMessage ? <p className="sk-hint" style={{ margin: 0 }}>{quote.deliveryMessage}</p> : null}
              <div className="sk-total"><dt>Total</dt><dd>{money(quote.total)}</dd></div>
            </dl>
          </>
        ) : <div className="sk-skeleton" style={{ height: 120 }} aria-busy="true" />}
        <button type="submit" className="sk-button sk-button-block" style={{ marginTop: 16 }} disabled={submitting || status !== 'ready'}>
          {submitting ? 'Placing your order…' : 'Place order'}
        </button>
        <p className="sk-hint" style={{ textAlign: 'center' }}><Link href="/cart">Back to cart</Link></p>
      </aside>
    </form>
  );
}

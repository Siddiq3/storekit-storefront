import Link from 'next/link';
import { whatsappLink } from '@storekit/shared';
import { UpiPanel } from './UpiPanel.jsx';
import { NoPhotoIcon } from './icons.jsx';
import { money } from '@/lib/money.js';
import { PAYMENT_LABELS } from '@/lib/checkout.js';

const PAYMENT_STATUS = {
  NOT_REQUIRED: 'Pay on delivery',
  PENDING_SUBMISSION: 'Waiting for your payment reference',
  PENDING_VERIFICATION: 'The shop is checking your payment',
  VERIFIED: 'Payment confirmed',
  REJECTED: 'Payment could not be confirmed',
  EXPIRED: 'Payment window expired',
};

/** How the order stands at a glance: done well, waiting on payment, or stopped. Said in words, not colour alone. */
const toneOf = (order) => {
  if (order.cancelled) return 'stopped';
  if (['PENDING_SUBMISSION', 'PENDING_VERIFICATION', 'REJECTED', 'EXPIRED'].includes(order.paymentStatus)) return 'pending';
  return 'ok';
};

const TONE_MARK = {
  ok: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>,
  pending: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>,
  stopped: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" /></svg>,
};

const dateTime = (iso) => {
  try { return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)); } catch { return ''; }
};

/**
 * An order as its owner sees it: what they bought, what it costs, where it is going and where it stands. The order's
 * internal id never gets here (the data layer strips it); the tracking token is only ever used to fetch and to pay.
 */
export function OrderView({ order, token, placed }) {
  const a = order.address ?? {};
  const addressLines = [
    [a.houseNo, a.street].filter(Boolean).join(', '),
    [a.area, a.landmark].filter(Boolean).join(', '),
    [a.city, a.district].filter(Boolean).join(', '),
    [a.state, a.pincode].filter(Boolean).join(' '),
  ].filter(Boolean);

  return (
    <div className="sk-two">
      <div>
        <div className="sk-success" data-tone={toneOf(order)}>
          <span className="sk-success-mark">{TONE_MARK[toneOf(order)]}</span>
          <h1>{order.cancelled ? 'This order was cancelled' : placed ? 'Thank you. Your order is placed.' : 'Your order'}</h1>
          <p>Order <strong className="sk-mono">{order.orderNumber}</strong> · <span className="sk-status" data-tone={toneOf(order)}>{order.statusLabel}</span></p>
          <p className="sk-success-total">{money(order.totals.total)} · {PAYMENT_LABELS[order.paymentMethod]?.title ?? order.paymentMethod}</p>
          <p className="sk-hint">Placed {dateTime(order.placedAt)}. Keep this page's link to check on your order later.</p>
        </div>

        <UpiPanel token={token} awaiting={Boolean(token) && Boolean(order.awaitingPaymentSubmission)} contact={{ phone: order.storePhone }} />

        <section className="sk-panel" aria-labelledby="sk-items-h" style={{ marginTop: 16 }}>
          <h2 id="sk-items-h">Items</h2>
          <ul className="sk-lines">
            {order.items.map((item, i) => (
              <li className="sk-line" key={`${item.name}-${i}`}>
                {item.imageUrl ? <img src={item.imageUrl} alt="" width="72" height="72" loading="lazy" /> : <span className="sk-line-photo sk-no-photo"><NoPhotoIcon /></span>}
                <div>
                  <div className="sk-line-name">{item.name}</div>
                  {item.variantLabel ? <div className="sk-hint">{item.variantLabel}</div> : null}
                  <div className="sk-hint">{money(item.unitPrice)} × {item.quantity}</div>
                  <strong>{money(item.lineTotal)}</strong>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {order.timeline?.length ? (
          <section className="sk-panel" aria-labelledby="sk-tl-h" style={{ marginTop: 16 }}>
            <h2 id="sk-tl-h">Progress</h2>
            <ol className="sk-steps">
              {order.timeline.map((step) => (
                <li key={step.status} data-done={step.done || undefined}>{step.label}{step.at ? <span className="sk-hint"> — {dateTime(step.at)}</span> : ''}</li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>

      <aside>
        <section className="sk-panel" aria-labelledby="sk-sum-h">
          <h2 id="sk-sum-h">Summary</h2>
          <dl className="sk-totals">
            <div><dt>Subtotal</dt><dd>{money(order.totals.subtotal)}</dd></div>
            {order.totals.couponDiscount > 0 ? <div><dt>Coupon</dt><dd>−{money(order.totals.couponDiscount)}</dd></div> : null}
            <div><dt>{order.delivery?.name ?? 'Delivery'}</dt><dd>{order.totals.deliveryFee > 0 ? money(order.totals.deliveryFee) : 'Free'}</dd></div>
            {order.delivery?.estimate ? <p className="sk-hint" style={{ margin: 0 }}>{order.delivery.estimate.label} (estimated when you ordered)</p> : null}
            <div className="sk-total"><dt>Total</dt><dd>{money(order.totals.total)}</dd></div>
          </dl>
          <p className="sk-hint" style={{ marginBottom: 0 }}>
            {PAYMENT_LABELS[order.paymentMethod]?.title ?? order.paymentMethod} · {PAYMENT_STATUS[order.paymentStatus] ?? ''}
          </p>
        </section>

        <section className="sk-panel" aria-labelledby="sk-ship-h" style={{ marginTop: 16 }}>
          <h2 id="sk-ship-h">Delivering to</h2>
          <p style={{ margin: 0 }}><strong>{a.fullName}</strong><br />{addressLines.map((l) => <span key={l}>{l}<br /></span>)}{a.mobile}</p>
          {a.instructions ? <p className="sk-hint">Note: {a.instructions}</p> : null}
        </section>

        <section className="sk-panel" aria-labelledby="sk-store-h" style={{ marginTop: 16 }}>
          <h2 id="sk-store-h">{order.storeName}</h2>
          <p style={{ margin: 0 }}>
            {order.storePhone ? <>Call <a href={`tel:${String(order.storePhone).replace(/\D/g, '')}`}>{order.storePhone}</a><br /></> : null}
            {order.storeWhatsapp ? <a href={whatsappLink(order.storeWhatsapp)} rel="noopener noreferrer" target="_blank">Message on WhatsApp</a> : null}
          </p>
        </section>

        <p style={{ textAlign: 'center', marginTop: 16 }}><Link className="sk-button sk-button-quiet" href="/">Continue shopping</Link></p>
      </aside>
    </div>
  );
}

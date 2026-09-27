import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearStoreCache } from '@/lib/store-data.js';
import {
  METHOD_GONE_ON_ORDER, METHOD_GONE_ON_QUOTE, deliveryAfterOrderError, deliveryAfterQuote, orderBody,
  pricedDeliveryOption, quoteBody, quoteSignature,
} from '@/lib/checkout.js';
import { fail, mockApi, ok, ULID } from './helpers.js';

/**
 * The checkout's delivery-method flow: the decisions the checkout page makes (lib/checkout.js), run through the
 * storefront's real API routes against a stand-in for the backend that prices each method the way the server does.
 */

let incoming = new Headers();
vi.mock('next/headers', () => ({ headers: async () => incoming }));

const { POST: quoteRoute } = await import('../app/api/quote/route.js');
const { POST: orderRoute } = await import('../app/api/orders/route.js');

const HOST = 'asha.storekit.site';
const lines = [{ productId: ULID, quantity: 1 }];
const address = { fullName: 'Asha Rao', mobile: '9876543210', houseNo: '12', street: 'MG Road', area: 'Indiranagar', city: 'Bengaluru', district: 'Bengaluru Urban', state: 'Karnataka', pincode: '560038' };
const post = (handler, payload, extra = {}) =>
  handler(new Request(`https://${HOST}/api/x`, {
    method: 'POST',
    headers: { host: HOST, origin: `https://${HOST}`, 'content-type': 'application/json', ...extra },
    body: JSON.stringify(payload),
  }));

const SUBTOTAL = 100_000;
const METHODS = { standard01: { name: 'Standard', fee: 4900 }, express001: { name: 'Express', fee: 14_900 } };

/** A stand-in for the backend's quote: prices the named method, or the main one; says when a named one is gone. */
const serverQuote = ({ init }) => {
  const request = JSON.parse(init.body);
  const known = request.deliveryMethodId in METHODS;
  const id = known ? request.deliveryMethodId : 'standard01';
  const deliveryOptions = Object.entries(METHODS).map(([key, m]) => ({ id: key, name: m.name, fee: m.fee, deliverable: true, estimate: null }));
  return ok({
    lines: [], subtotal: SUBTOTAL, couponDiscount: 0, deliverable: true, deliveryOptions,
    deliveryMethodId: id,
    deliveryMethodUnavailable: Boolean(request.deliveryMethodId) && !known,
    deliveryFee: METHODS[id].fee,
    total: SUBTOTAL + METHODS[id].fee,
  });
};

const requestOf = (call) => JSON.parse(call.init.body);

describe('checkout: choosing a delivery method', () => {
  beforeEach(() => {
    clearStoreCache();
    incoming = new Headers({ 'x-storekit-slug': 'asha', 'x-storekit-host': HOST, 'x-storekit-canonical-host': HOST, 'cf-connecting-ip': '203.0.113.7' });
  });

  it('choosing Standard, then Express, asks for a new quote each time, and shows the server’s price and total', async () => {
    const calls = mockApi({ 'POST /public/stores/asha/cart/quote': serverQuote });

    const standard = { lines, pincode: '560038', deliveryMethodId: 'standard01' };
    const express = { ...standard, deliveryMethodId: 'express001' };
    // A different method is a different quote: the page re-asks when the signature changes.
    expect(quoteSignature(express)).not.toBe(quoteSignature(standard));

    const first = (await (await post(quoteRoute, quoteBody(standard))).json());
    expect(pricedDeliveryOption(first)).toMatchObject({ id: 'standard01', name: 'Standard', fee: 4900 });
    expect(first.total).toBe(SUBTOTAL + 4900);

    const second = (await (await post(quoteRoute, quoteBody(express))).json());
    expect(pricedDeliveryOption(second)).toMatchObject({ id: 'express001', name: 'Express', fee: 14_900 });
    expect(second.total).toBe(SUBTOTAL + 14_900);

    // What reached the backend: the method, never a fee or a total.
    expect(calls.map((c) => requestOf(c).deliveryMethodId)).toEqual(['standard01', 'express001']);
    for (const call of calls) {
      expect(requestOf(call)).not.toHaveProperty('deliveryFee');
      expect(requestOf(call)).not.toHaveProperty('total');
    }
  });

  it('a method that has gone since the page loaded: follows the server’s choice and says so', async () => {
    mockApi({ 'POST /public/stores/asha/cart/quote': serverQuote });
    const quote = (await (await post(quoteRoute, quoteBody({ lines, deliveryMethodId: 'removed0001' }))).json());

    expect(deliveryAfterQuote(quote)).toEqual({ methodId: 'standard01', notice: METHOD_GONE_ON_QUOTE });
    // The summary then shows the method actually priced, not the one that went away.
    expect(pricedDeliveryOption(quote).name).toBe('Standard');
    expect(quote.total).toBe(SUBTOTAL + 4900);
  });

  it('a normal quote changes nothing', async () => {
    mockApi({ 'POST /public/stores/asha/cart/quote': serverQuote });
    const quote = (await (await post(quoteRoute, quoteBody({ lines, deliveryMethodId: 'express001' }))).json());
    expect(deliveryAfterQuote(quote)).toBe(null);
    expect(deliveryAfterQuote(null)).toBe(null);
  });

  it('a method removed between quote and order: the error is surfaced, nothing is placed with another method', async () => {
    const calls = mockApi({
      'POST /public/stores/asha/orders': fail(400, 'DELIVERY_METHOD_UNAVAILABLE', 'That delivery option is no longer available. Please choose another.'),
    });
    const body = orderBody({ lines, address, paymentMethod: 'COD', deliveryMethodId: 'express001', expectedTotal: SUBTOTAL + 14_900 });
    const response = await post(orderRoute, body, { 'x-idempotency-key': 'delivery-flow-0001' });
    const result = await response.json();

    expect(response.status).toBe(400);
    const next = deliveryAfterOrderError({ code: result.error.code });
    expect(next).toEqual({ methodId: '', notice: METHOD_GONE_ON_ORDER });
    expect(next.notice).toMatch(/no longer available/);
    // One request only: the page does not resend the order with a different method on its own.
    expect(calls).toHaveLength(1);
    expect(requestOf(calls[0]).deliveryMethodId).toBe('express001');
    // Other failures are not treated as a delivery problem.
    expect(deliveryAfterOrderError({ code: 'TOTAL_MISMATCH' })).toBe(null);
  });

  it('never sends a delivery price: the helpers drop one, and the storefront’s own API refuses one', async () => {
    expect(quoteBody({ lines, deliveryMethodId: 'express001', deliveryFee: 0, total: 1 })).toEqual({ lines, deliveryMethodId: 'express001' });
    expect(orderBody({ lines, address, paymentMethod: 'COD', deliveryMethodId: 'express001', expectedTotal: 1, deliveryFee: 0 })).not.toHaveProperty('deliveryFee');

    const calls = mockApi({ 'POST /public/stores/asha/cart/quote': serverQuote, 'POST /public/stores/asha/orders': ok({}) });
    expect((await post(quoteRoute, { lines, deliveryFee: 0 })).status).toBe(400);
    expect((await post(orderRoute, { ...orderBody({ lines, address, paymentMethod: 'COD', expectedTotal: 1 }), deliveryFee: 0 }, { 'x-idempotency-key': 'delivery-flow-0002' })).status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it('refuses a malformed method id before it reaches the backend', async () => {
    const calls = mockApi({ 'POST /public/stores/asha/cart/quote': serverQuote });
    expect((await post(quoteRoute, { lines, deliveryMethodId: 'x' })).status).toBe(400);
    expect((await post(quoteRoute, { lines, deliveryMethodId: '../../admin' })).status).toBe(400);
    expect(calls).toHaveLength(0);
  });
});

'use client';

import { useEffect, useState } from 'react';
import { toQuoteLines } from '@/lib/cart.js';
import { postJson } from '@/lib/client-api.js';

/**
 * The server's quote for the cart: every price, discount, fee and total a shopper sees comes from here. Re-run
 * (after a short pause) when the lines, coupon, pincode or payment method change; a stale answer never overwrites a
 * newer one.
 */
export function useQuote({ lines, ready, couponCode, pincode, paymentMethod }) {
  const [state, setState] = useState({ status: 'idle', quote: null, error: null });
  const signature = JSON.stringify([toQuoteLines(lines), couponCode || null, pincode || null, paymentMethod || null]);
  const [refreshes, setRefreshes] = useState(0);

  useEffect(() => {
    if (!ready) return undefined;
    if (lines.length === 0) { setState({ status: 'idle', quote: null, error: null }); return undefined; }

    let current = true;
    setState((s) => ({ ...s, status: 'loading', error: null }));
    const timer = setTimeout(async () => {
      const result = await postJson('/api/quote', {
        lines: toQuoteLines(lines),
        ...(couponCode ? { couponCode } : {}),
        ...(/^[1-9]\d{5}$/.test(pincode ?? '') ? { pincode } : {}),
        ...(paymentMethod ? { paymentMethod } : {}),
      });
      if (!current) return;
      setState(result.ok
        ? { status: 'ready', quote: result.data, error: null }
        : { status: 'error', quote: null, error: result });
    }, 250);

    return () => { current = false; clearTimeout(timer); };
    // `signature` is the whole input; `lines` itself changes identity on every render of the provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, ready, refreshes]);

  return { ...state, refresh: () => setRefreshes((n) => n + 1) };
}

const COUPON_KEY = 'storekit.coupon.v1';

export const readCoupon = () => {
  try { return sessionStorage.getItem(COUPON_KEY) ?? ''; } catch { return ''; }
};

export const writeCoupon = (code) => {
  try { if (code) sessionStorage.setItem(COUPON_KEY, code); else sessionStorage.removeItem(COUPON_KEY); } catch { /* not persisted */ }
};

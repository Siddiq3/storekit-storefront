'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { addLine, itemCount, removeLine, sanitize, setQuantity } from '@/lib/cart.js';

/**
 * The cart lives in this browser, on this store's own address (localStorage is per origin, so one store's cart is
 * never another's). Only ids and quantities matter; everything a shopper pays is quoted by the server.
 */

const STORAGE_KEY = 'storekit.cart.v1';
const CartContext = createContext(null);

const read = () => {
  try { return sanitize(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')); } catch { return []; }
};

export function CartProvider({ children }) {
  const [lines, setLines] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLines(read());
    setReady(true);
    // Another tab of the same store changed the cart.
    const onStorage = (event) => { if (event.key === STORAGE_KEY) setLines(read()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const commit = useCallback((next) => {
    setLines(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* private mode: the cart lasts for this page view */ }
  }, []);

  const value = useMemo(() => ({
    lines,
    ready,
    count: itemCount(lines),
    add: (line) => commit(addLine(lines, line)),
    setQuantity: (key, quantity) => commit(setQuantity(lines, key, quantity)),
    remove: (key) => commit(removeLine(lines, key)),
    clear: () => commit([]),
  }), [lines, ready, commit]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
};

'use client';

import Link from 'next/link';
import { useCart } from './CartProvider.jsx';
import { BagIcon } from './icons.jsx';

export function CartLink() {
  const { count, ready } = useCart();
  return (
    <Link href="/cart" className="sk-cart-link" prefetch={false} aria-label={`Cart, ${ready ? count : 0} items`}>
      <BagIcon />
      {/* Keyed by the count, so a change replays the small pop that says "it went in". */}
      {ready && count > 0 ? <span key={count} className="sk-cart-count" aria-hidden="true">{count}</span> : null}
    </Link>
  );
}

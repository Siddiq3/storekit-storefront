'use client';

import Link from 'next/link';
import { useCart } from './CartProvider.jsx';
import { BagIcon } from './icons.jsx';

export function CartLink() {
  const { count, ready } = useCart();
  return (
    <Link href="/cart" className="sk-cart-link" aria-label={`Cart, ${ready ? count : 0} items`}>
      <BagIcon />
      {ready && count > 0 ? <span className="sk-cart-count" aria-hidden="true">{count}</span> : null}
    </Link>
  );
}

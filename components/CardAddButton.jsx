'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useOptionalCart } from './CartProvider.jsx';
import { productPath } from '@/lib/urls.js';

/**
 * The card's own action. A simple product goes straight into the cart, and the button says so for a
 * moment; one with options (size, colour) opens its page to choose. Prices in the cart are only a
 * preview — checkout is quoted by the server.
 */
export function CardAddButton({ product }) {
  const cart = useOptionalCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return undefined;
    const timer = setTimeout(() => setAdded(false), 1600);
    return () => clearTimeout(timer);
  }, [added]);

  if (product.hasVariants) {
    return <Link href={productPath(product)} prefetch={false} className="sk-card-add">Choose options</Link>;
  }
  if (!cart) return null;

  const add = () => {
    cart.add({
      productId: product.productId,
      variantId: null,
      quantity: 1,
      name: product.name,
      slug: product.slug,
      imageUrl: product.imageUrl,
      unitPrice: product.price,
    });
    setAdded(true);
  };

  return (
    <button type="button" className="sk-card-add" data-added={added || undefined} onClick={add} aria-label={`Add ${product.name} to cart`}>
      <span aria-live="polite">{added ? 'Added ✓' : 'Add to cart'}</span>
    </button>
  );
}

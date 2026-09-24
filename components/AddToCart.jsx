'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useCart } from './CartProvider.jsx';
import { money } from '@/lib/money.js';

/** The variant whose attributes match every chosen option, or null while a choice is missing. */
export const matchVariant = (product, chosen) => {
  const names = (product.variantOptions ?? []).map((o) => o.name);
  if (names.length === 0 || names.some((n) => !chosen[n])) return null;
  return (product.variants ?? []).find((v) => names.every((n) => v.attributes?.[n] === chosen[n])) ?? null;
};

const variantLabel = (chosen) => Object.values(chosen).join(' / ');

export function AddToCart({ product }) {
  const cart = useCart();
  const [chosen, setChosen] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const options = product.variantOptions ?? [];
  const variant = useMemo(() => matchVariant(product, chosen), [product, chosen]);
  const needsChoice = options.length > 0 && !variant;
  const purchasable = variant ? variant.inStock : product.inStock;

  // A value is disabled when no in-stock variant has it together with what is already chosen.
  const available = (name, value) =>
    (product.variants ?? []).some((v) => v.inStock && v.attributes?.[name] === value
      && Object.entries(chosen).every(([n, val]) => n === name || v.attributes?.[n] === val));

  const price = variant?.price ?? product.price;
  const mrp = variant?.mrp ?? product.mrp;

  const add = () => {
    if (!purchasable || needsChoice) return;
    cart.add({
      productId: product.productId,
      variantId: variant?.variantId ?? null,
      quantity,
      name: product.name,
      slug: product.slug,
      imageUrl: variant?.imageUrl ?? product.imageUrl,
      unitPrice: price,
      variantLabel: variant ? variantLabel(chosen) : undefined,
    });
    setAdded(true);
  };

  return (
    <div>
      <p className="sk-product-price">
        <span className="sk-price">{money(price)}</span>
        {mrp > price ? <span className="sk-mrp">{money(mrp)}</span> : null}
        {mrp > price ? <span className="sk-off">{Math.round((1 - price / mrp) * 100)}% off</span> : null}
      </p>

      {options.length ? (
        <div className="sk-options">
          {options.map((option) => (
            <fieldset key={option.name} style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="sk-hint">{option.name}{chosen[option.name] ? `: ${chosen[option.name]}` : ''}</legend>
              <div className="sk-option-values">
                {option.values.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="sk-option"
                    aria-pressed={chosen[option.name] === value}
                    disabled={!available(option.name, value)}
                    onClick={() => { setChosen({ ...chosen, [option.name]: value }); setAdded(false); }}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      ) : null}

      <p className="sk-stock" data-tone={purchasable ? (product.stockLabel === 'low_stock' ? 'low' : 'ok') : 'out'}>
        {!purchasable ? 'Out of stock' : product.stockRemaining ? `Only ${product.stockRemaining} left` : product.stockLabel === 'backorder' ? 'Available on backorder' : 'In stock'}
      </p>

      <div className="sk-buy">
        <div className="sk-qty" role="group" aria-label="Quantity">
          <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
          <output aria-live="polite">{quantity}</output>
          <button type="button" aria-label="Increase quantity" onClick={() => setQuantity((q) => Math.min(99, q + 1))}>+</button>
        </div>
        <button type="button" className="sk-button" onClick={add} disabled={!purchasable}>
          {!purchasable ? 'Out of stock' : needsChoice ? 'Choose options' : 'Add to cart'}
        </button>
      </div>
      {needsChoice && purchasable ? <p className="sk-hint" role="status">Choose {options.map((o) => o.name.toLowerCase()).join(' and ')} to add this to your cart.</p> : null}

      {added ? (
        <p className="sk-notice" role="status" style={{ marginTop: 16 }}>
          Added to your cart. <Link href="/cart"><strong>View cart</strong></Link>
        </p>
      ) : null}
    </div>
  );
}

import Link from 'next/link';
import { money } from '@/lib/money.js';
import { productPath } from '@/lib/urls.js';
import { CardAddButton } from './CardAddButton.jsx';
import { NamePlate } from './Initial.jsx';

/**
 * One product in a grid, the way Indian shoppers read a marketplace card: the photo, the name (two lines, never cut
 * to "Handloom Cotto…"), then the price, the MRP it is down from and the saving ("15% off"). Badges are the API's own
 * ("New!", "Sale"); a sold-out product shows no price, badge or button. The brand shows only when the owner set one.
 */
export function ProductCard({ product }) {
  const out = product.inStock === false;
  const off = product.discountPercent > 0 ? `${product.discountPercent}% off` : null;
  return (
    <li className="sk-card" data-out={out || undefined}>
      <Link href={productPath(product)} className="sk-card-link" prefetch={false}>
        <div className="sk-card-media">
          {product.imageUrl
            ? <img src={product.imageUrl} alt={product.name} width="400" height="500" loading="lazy" decoding="async" />
            : <span className="sk-no-photo"><NamePlate name={product.name} /></span>}
          {/* The saving is read in the price line; the photo carries only Sale and New. */}
          {!out && ((product.onSale && !off) || product.isNew) ? (
            <div className="sk-badges">
              {product.onSale && !off ? <span className="sk-badge">Sale</span> : null}
              {product.isNew ? <span className="sk-badge sk-badge-new">New!</span> : null}
            </div>
          ) : null}
          {out ? <span className="sk-card-soldout">OUT OF STOCK</span> : null}
        </div>
        <div className="sk-card-body">
          {product.brand ? <span className="sk-card-brand">{product.brand}</span> : null}
          <span className="sk-card-name">{product.name}</span>
          {out ? null : (
            <span className="sk-card-price">
              <span className="sk-price">{product.hasVariants ? 'From ' : ''}{money(product.price)}</span>
              {product.mrp > product.price ? <span className="sk-mrp">{money(product.mrp)}</span> : null}
              {off ? <span className="sk-off">{off}</span> : null}
            </span>
          )}
        </div>
      </Link>
      {out ? null : <div className="sk-card-actions"><CardAddButton product={product} /></div>}
    </li>
  );
}

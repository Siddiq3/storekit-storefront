import Link from 'next/link';
import { money } from '@/lib/money.js';
import { productPath } from '@/lib/urls.js';
import { CardAddButton } from './CardAddButton.jsx';
import { NoPhotoIcon } from './icons.jsx';

/**
 * One product in a grid: the photo leads, then the name (two lines, never cut to "Handloom Cotto…"), the
 * price with the MRP it is down from, and an Add button. Badges are the API's own ("15% off", "New!",
 * "Sale"); a sold-out product shows no price, badge or button. The brand shows only when the owner set one.
 */
export function ProductCard({ product }) {
  const out = product.inStock === false;
  const off = product.discountPercent > 0 ? `${product.discountPercent}% off` : null;
  return (
    <li className="sk-card">
      <Link href={productPath(product)} className="sk-card-link" prefetch={false}>
        <div className="sk-card-media">
          {product.imageUrl
            ? <img src={product.imageUrl} alt={product.name} width="400" height="500" loading="lazy" decoding="async" />
            : <span className="sk-no-photo"><NoPhotoIcon /></span>}
          {!out && (off || product.isNew || product.onSale) ? (
            <div className="sk-badges">
              {off ? <span className="sk-badge">{off}</span> : product.onSale ? <span className="sk-badge">Sale</span> : null}
              {product.isNew ? <span className="sk-badge sk-badge-new">New!</span> : null}
            </div>
          ) : null}
        </div>
        <div className="sk-card-body">
          {product.brand ? <span className="sk-card-brand">{product.brand}</span> : null}
          <span className="sk-card-name">{product.name}</span>
          {out ? (
            <span className="sk-card-out">OUT OF STOCK</span>
          ) : (
            <span className="sk-card-price">
              <span className="sk-price">{product.hasVariants ? 'From ' : ''}{money(product.price)}</span>
              {product.mrp > product.price ? <span className="sk-mrp">{money(product.mrp)}</span> : null}
            </span>
          )}
        </div>
      </Link>
      {out ? null : <div className="sk-card-actions"><CardAddButton product={product} /></div>}
    </li>
  );
}

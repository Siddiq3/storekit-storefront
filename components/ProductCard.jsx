import Link from 'next/link';
import { money } from '@/lib/money.js';
import { productPath } from '@/lib/urls.js';

/** "15% OFF" and "NEW!" / "SALE" badges, as the API reports them; a sold-out product shows no price. */
export function ProductCard({ product, storeName }) {
  const out = product.inStock === false;
  const off = product.discountPercent > 0 ? `${product.discountPercent}% off` : null;
  return (
    <li>
      <Link href={productPath(product)} className="sk-card">
        <div className="sk-card-media">
          {product.imageUrl
            ? <img src={product.imageUrl} alt={product.name} width="400" height="500" loading="lazy" decoding="async" />
            : null}
          {!out && (off || product.isNew || product.onSale) ? (
            <div className="sk-badges">
              {off ? <span className="sk-badge">{off}</span> : product.onSale ? <span className="sk-badge">Sale</span> : null}
              {product.isNew ? <span className="sk-badge sk-badge-new">New!</span> : null}
            </div>
          ) : null}
        </div>
        <div className="sk-card-body">
          <span className="sk-card-name">{product.name}</span>
          {product.brand || storeName ? <span className="sk-card-brand">{product.brand || storeName}</span> : null}
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
    </li>
  );
}

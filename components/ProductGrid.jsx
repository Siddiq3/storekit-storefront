import { ProductCard } from './ProductCard.jsx';

/** `rail`: on a phone, a home section scrolls sideways instead of growing the page; a grid again on wider screens. */
export function ProductGrid({ products, layout = 'grid', label, rail = false }) {
  return (
    <ul className="sk-grid" data-layout={layout} data-rail={rail && layout !== 'list' && products.length > 2 ? '' : undefined} aria-label={label}>
      {products.map((p) => <ProductCard key={p.productId} product={p} />)}
    </ul>
  );
}

export function EmptyProducts({ message = 'There are no products here yet.' }) {
  return <div className="sk-empty" role="status">{message}</div>;
}

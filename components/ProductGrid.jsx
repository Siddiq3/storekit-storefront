import { ProductCard } from './ProductCard.jsx';

export function ProductGrid({ products, layout = 'grid', label }) {
  return (
    <ul className="sk-grid" data-layout={layout} aria-label={label}>
      {products.map((p) => <ProductCard key={p.productId} product={p} />)}
    </ul>
  );
}

export function EmptyProducts({ message = 'There are no products here yet.' }) {
  return <div className="sk-empty" role="status">{message}</div>;
}

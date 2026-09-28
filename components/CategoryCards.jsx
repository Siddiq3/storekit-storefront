import Link from 'next/link';
import { categoryPath } from '@/lib/urls.js';

/**
 * The owner's categories as compact photo tiles with the name beneath — navigation, not posters. A row that
 * scrolls sideways on a phone, a grid on a wider screen. A category without a photo gets a tint of the store's
 * colour with its initial.
 */
export function CategoryCards({ categories }) {
  if (!categories.length) return null;
  return (
    <ul className="sk-cats">
      {categories.map((category) => (
        <li key={category.categoryId}>
          <Link href={categoryPath(category)} prefetch={false} className="sk-cat">
            <span className={category.imageUrl ? 'sk-cat-media' : 'sk-cat-media sk-cat-plain'}>
              {category.imageUrl
                ? <img src={category.imageUrl} alt="" width="320" height="320" loading="lazy" decoding="async" />
                : <span className="sk-cat-initial" aria-hidden="true">{category.name.trim().charAt(0).toUpperCase()}</span>}
            </span>
            <span className="sk-cat-name">{category.name}</span>
            {category.productCount ? <span className="sk-cat-count">{category.productCount} {category.productCount === 1 ? 'product' : 'products'}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

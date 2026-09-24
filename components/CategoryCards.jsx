import Link from 'next/link';
import { categoryPath } from '@/lib/urls.js';

/** Photo cards for the owner's categories. A category without a photo gets the store's own colours. */
export function CategoryCards({ categories }) {
  if (!categories.length) return null;
  return (
    <ul className="sk-cats">
      {categories.map((category) => (
        <li key={category.categoryId}>
          <Link href={categoryPath(category)} className={category.imageUrl ? 'sk-cat' : 'sk-cat sk-cat-plain'}>
            {category.imageUrl ? <img src={category.imageUrl} alt="" width="600" height="800" loading="lazy" decoding="async" /> : null}
            <span className="sk-cat-body">
              <span className="sk-cat-name">{category.name}</span>
              {category.productCount ? <span className="sk-cat-count">{category.productCount} {category.productCount === 1 ? 'product' : 'products'}</span> : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

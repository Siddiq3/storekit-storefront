import Link from 'next/link';
import { CartLink } from './CartLink.jsx';
import { NavLinks } from './NavLinks.jsx';
import { MenuIcon, PinIcon, SearchIcon } from './icons.jsx';
import { categoryPath } from '@/lib/urls.js';

/**
 * Menu and search on a phone; brand, search, "Track order" and cart, with the category row beneath, on a desktop.
 * The menu is a <details> element: it works without scripts and is keyboard and screen-reader accessible.
 */
export function Header({ store, categories = [] }) {
  const top = categories.filter((c) => !c.parentId).slice(0, 8);
  return (
    <header className="sk-header">
      <div className="sk-container">
        <div className="sk-header-row">
          <details className="sk-menu">
            <summary aria-label="Menu"><MenuIcon /></summary>
            <nav className="sk-menu-panel" aria-label="Menu">
              <Link href="/">Home</Link>
              <Link href="/products">All products</Link>
              {top.map((c) => <Link key={c.categoryId} href={categoryPath(c)}>{c.name}</Link>)}
              <Link href="/track">Track order</Link>
            </nav>
          </details>

          <Link href="/" className="sk-brand">
            {store.logoUrl ? <img src={store.logoUrl} alt={store.name} height="36" /> : <span>{store.name}</span>}
          </Link>

          <div className="sk-header-actions">
            <Link href="/track" className="sk-track"><PinIcon /> Track order</Link>
            <CartLink />
          </div>

          <form className="sk-search" action="/search" role="search">
            <SearchIcon />
            <label className="sk-visually-hidden" htmlFor="sk-q">Search {store.name}</label>
            <input id="sk-q" name="q" type="search" placeholder="Search products…" minLength={2} maxLength={80} autoComplete="off" />
          </form>
        </div>
      </div>

      <nav className="sk-nav" aria-label="Categories">
        <NavLinks links={[{ href: '/', label: 'Home' }, ...top.map((c) => ({ href: categoryPath(c), label: c.name }))]} />
      </nav>
    </header>
  );
}

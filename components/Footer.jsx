import Link from 'next/link';
import { loadConfig } from '@/lib/config.js';
import { categoryPath, safeHttpsUrl } from '@/lib/urls.js';

const digits = (value) => String(value ?? '').replace(/\D/g, '');
const SOCIAL_LABELS = { instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', twitter: 'X', x: 'X', website: 'Website' };

export function Footer({ store, categories = [] }) {
  const { contact = {}, social = {} } = store;
  const whatsapp = digits(contact.whatsapp);
  const socials = Object.entries(social).map(([key, value]) => [key, safeHttpsUrl(value)]).filter(([, url]) => url);
  const address = [contact.addressLine, contact.city, contact.state].filter(Boolean).join(', ');
  const branding = store.showBranding ? loadConfig().rootUrl : null;
  const top = categories.filter((c) => !c.parentId).slice(0, 8);
  const pages = store.pages ?? [];

  return (
    <footer className="sk-footer">
      <div className="sk-container">
        <div className="sk-footer-grid">
          <div className="sk-footer-brand">
            {store.logoUrl ? <img src={store.logoUrl} alt={store.name} height="34" /> : <div>{store.name}</div>}
            {store.footerText ? <p style={{ fontWeight: 400, fontSize: '0.8125rem', color: 'var(--sk-muted)' }}>{store.footerText}</p> : null}
          </div>

          {top.length ? (
            <div>
              <h2>Categories</h2>
              <ul>{top.map((c) => <li key={c.categoryId}><Link href={categoryPath(c)}>{c.name}</Link></li>)}</ul>
            </div>
          ) : null}

          <div>
            <h2>Support</h2>
            <ul>
              {pages.map((p) => <li key={p.slug}><Link href={`/pages/${p.slug}`}>{p.title}</Link></li>)}
              <li><Link href="/track">Track order</Link></li>
              {contact.phone ? <li><a href={`tel:${digits(contact.phone)}`}>{contact.phone}</a></li> : null}
              {whatsapp ? <li><a href={`https://wa.me/${whatsapp}`} rel="noopener noreferrer" target="_blank">WhatsApp</a></li> : null}
              {contact.email ? <li><a href={`mailto:${contact.email}`}>{contact.email}</a></li> : null}
              {socials.map(([key, url]) => <li key={key}><a href={url} rel="noopener noreferrer nofollow" target="_blank">{SOCIAL_LABELS[key] ?? key}</a></li>)}
            </ul>
            {address ? <p>{address}</p> : null}
          </div>
        </div>
        <div className="sk-copyright">
          <span>© {new Date().getFullYear()} {store.name}. All Rights Reserved.</span>
          {branding ? <span>Powered by <a href={branding} rel="noopener">StoreKit</a></span> : null}
        </div>
      </div>
    </footer>
  );
}

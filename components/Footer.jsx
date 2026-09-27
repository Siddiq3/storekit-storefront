import Link from 'next/link';
import { whatsappLink } from '@storekit/shared';
import { loadConfig } from '@/lib/config.js';
import { categoryPath, safeHttpsUrl } from '@/lib/urls.js';
import { ChatIcon, MailIcon, PhoneIcon, PinIcon } from './icons.jsx';
import { PolicyLink } from './PolicyLink.jsx';

const digits = (value) => String(value ?? '').replace(/\D/g, '');
const SOCIAL_LABELS = { instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', twitter: 'X', x: 'X', website: 'Website' };

/**
 * Brand, then three labelled columns — Shop (where to go), Support (the store's policies and pages) and Contact (how
 * to reach the owner) — so a customer finds a phone number under "Contact", not between two policies. A policy link
 * opens the policy in a dialog over the page (PolicyLink); its address also works on its own.
 */
export function Footer({ store, categories = [] }) {
  const { contact = {}, social = {} } = store;
  const phone = digits(contact.phone);
  const whatsapp = whatsappLink(contact.whatsapp);
  const socials = Object.entries(social).map(([key, value]) => [key, safeHttpsUrl(value)]).filter(([, url]) => url);
  const address = [contact.addressLine, contact.city, contact.state, contact.pincode].filter(Boolean).join(', ');
  const branding = store.showBranding ? loadConfig().rootUrl : null;
  const top = categories.filter((c) => !c.parentId).slice(0, 6);
  const pages = store.pages ?? [];
  const policies = store.policies ?? [];
  const about = store.footerText || store.description;
  const hasContact = phone || whatsapp || contact.email || address;

  return (
    <footer className="sk-footer">
      <div className="sk-container">
        <div className="sk-footer-grid">
          <div className="sk-footer-brand">
            <Link href="/" prefetch={false} className="sk-footer-logo">
              {store.logoUrl ? <img src={store.logoUrl} alt={store.name} height="40" /> : <span>{store.name}</span>}
            </Link>
            {about ? <p>{about}</p> : null}
            {socials.length ? (
              <ul className="sk-footer-social">
                {socials.map(([key, url]) => <li key={key}><a href={url} rel="noopener noreferrer nofollow" target="_blank">{SOCIAL_LABELS[key] ?? key}</a></li>)}
              </ul>
            ) : null}
          </div>

          <nav aria-labelledby="ft-shop">
            <h2 id="ft-shop">Shop</h2>
            <ul>
              <li><Link href="/products" prefetch={false}>All products</Link></li>
              {top.map((c) => <li key={c.categoryId}><Link href={categoryPath(c)} prefetch={false}>{c.name}</Link></li>)}
              <li><Link href="/track" prefetch={false}>Track order</Link></li>
              <li><Link href="/cart" prefetch={false}>Cart</Link></li>
            </ul>
          </nav>

          {policies.length || pages.length ? (
            <nav aria-labelledby="ft-support">
              <h2 id="ft-support">Support</h2>
              <ul>
                {policies.map((p) => <li key={p.type}><PolicyLink slug={p.slug}>{p.title}</PolicyLink></li>)}
                {pages.map((p) => <li key={p.slug}><Link href={`/pages/${p.slug}`} prefetch={false}>{p.title}</Link></li>)}
              </ul>
            </nav>
          ) : null}

          {hasContact ? (
            <div className="sk-footer-contact">
              <h2>Contact</h2>
              <ul>
                {phone ? <li><a href={`tel:${phone}`}><PhoneIcon /> {contact.phone}</a></li> : null}
                {whatsapp ? <li><a href={whatsapp} rel="noopener noreferrer" target="_blank"><ChatIcon /> Chat on WhatsApp</a></li> : null}
                {contact.email ? <li><a href={`mailto:${contact.email}`}><MailIcon /> {contact.email}</a></li> : null}
                {address ? <li><span><PinIcon /> {address}</span></li> : null}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
      <div className="sk-copyright">
        <div className="sk-container">
          <span>© {new Date().getFullYear()} {store.name}. All Rights Reserved.</span>
          {branding ? <span>Powered by <a href={branding} rel="noopener">StoreKit</a></span> : null}
        </div>
      </div>
    </footer>
  );
}

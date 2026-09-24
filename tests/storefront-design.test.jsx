import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ApiError } from '@/lib/errors.js';
import { clearStoreCache, toStore } from '@/lib/store-data.js';
import { fail, mockApi, ok, rawStore } from './helpers.js';

let loaded;
const data = { home: null, page: null, categories: [] };
const ctx = { slug: 'asha', host: 'asha.storekit.site', canonicalHost: 'asha.storekit.site', ip: null };
let incoming = new Headers();

vi.mock('next/headers', () => ({ headers: async () => incoming }));
vi.mock('@/lib/load.js', () => ({ loadStoreOrState: async () => loaded }));
vi.mock('@/lib/store-data.js', async (original) => {
  const real = await original();
  const pick = (key) => async () => { const v = data[key]; if (v instanceof Error) throw v; return v; };
  return { ...real, getHome: pick('home'), getPage: pick('page'), getCategories: pick('categories'), listProducts: async () => ({ items: [], nextCursor: null }) };
});

const { default: StoreLayout } = await import('../app/(store)/layout.js');
const { default: Home } = await import('../app/(store)/(browse)/page.js');
const { default: StorePage } = await import('../app/(store)/(detail)/pages/[pageSlug]/page.js');
const { CartProvider } = await import('@/components/CartProvider.jsx');
const { ProductCard } = await import('@/components/ProductCard.jsx');
const { CategoryCards } = await import('@/components/CategoryCards.jsx');
const { ValueStrip } = await import('@/components/ValueStrip.jsx');
const { Footer } = await import('@/components/Footer.jsx');
const { Header } = await import('@/components/Header.jsx');
const { POST: lookup } = await import('../app/api/orders/lookup/route.js');

const active = (over = {}) => ({ ok: true, store: toStore(rawStore(over)), ctx, canonicalHost: ctx.canonicalHost });
const html = async (element) => renderToStaticMarkup(<CartProvider>{await element}</CartProvider>);
const card = (over = {}) => ({ productId: '01H8XGJWBWBAQ4Z4RZ4ZQ1ZQ1Z', slug: 'ring', name: 'Ring', price: 79900, mrp: 99900, discountPercent: 20, inStock: true, imageUrl: 'https://cdn.test.local/r.jpg', ...over });

beforeEach(() => {
  loaded = active();
  clearStoreCache();
  Object.assign(data, { home: { store: loaded.store, categories: [], sections: [] }, page: null });
});

describe('product cards', () => {
  const render = (product, storeName) => renderToStaticMarkup(<ul><ProductCard product={product} storeName={storeName} /></ul>);

  it('show the discount, NEW and SALE badges the API reports', () => {
    const out = render(card({ isNew: true, onSale: true }));
    expect(out).toContain('20% off');
    expect(out).toContain('New!');
    expect(render(card({ discountPercent: 0, onSale: true }))).toContain('Sale');
    expect(render(card({ discountPercent: 0 }))).not.toContain('sk-badge');
  });

  it('show the price and the crossed-out MRP', () => {
    const out = render(card());
    expect(out).toContain('₹799');
    expect(out).toContain('₹999');
  });

  it('a sold-out product says OUT OF STOCK and shows no price or badge', () => {
    const out = render(card({ inStock: false, isNew: true }));
    expect(out).toContain('OUT OF STOCK');
    expect(out).not.toContain('₹799');
    expect(out).not.toContain('sk-badge');
  });

  it('names the brand, or the shop when there is none', () => {
    expect(render(card({ brand: 'Aurum' }), 'Asha')).toContain('Aurum');
    expect(render(card(), 'Asha')).toContain('Asha');
  });
});

describe('category cards', () => {
  const cats = [{ categoryId: 'c1', name: 'Earrings', slug: 'earrings', imageUrl: 'https://cdn.test.local/e.jpg', productCount: 4 }, { categoryId: 'c2', name: 'Rings', slug: 'rings', productCount: 1 }];

  it('link to the category, with its photo and product count', () => {
    const out = renderToStaticMarkup(<CategoryCards categories={cats} />);
    expect(out).toContain('href="/category/earrings"');
    expect(out).toContain('https://cdn.test.local/e.jpg');
    expect(out).toContain('4 products');
    expect(out).toContain('1 product<');
  });

  it('render nothing without categories', () => {
    expect(renderToStaticMarkup(<CategoryCards categories={[]} />)).toBe('');
  });
});

describe('the value strip only claims what the checkout can do', () => {
  const strip = (over) => renderToStaticMarkup(<ValueStrip store={toStore(rawStore(over))} />);

  it('cash on delivery only when COD is on, UPI only when UPI is on', () => {
    expect(strip({ paymentMethods: ['COD'] })).toContain('Cash On Delivery');
    expect(strip({ paymentMethods: ['COD'] })).not.toContain('UPI');
    expect(strip({ paymentMethods: ['UPI_MANUAL'] })).not.toContain('Cash On Delivery');
    expect(strip({ paymentMethods: ['UPI_MANUAL'] })).toContain('UPI');
  });

  it('never shows card or wallet logos: shoppers cannot pay that way', () => {
    const out = strip({ paymentMethods: ['COD', 'UPI_MANUAL'] });
    for (const brand of ['VISA', 'Mastercard', 'RuPay', 'Cashfree', 'Paytm']) expect(out).not.toMatch(new RegExp(brand, 'i'));
  });

  it('free shipping follows the delivery rule, with the real threshold', () => {
    expect(strip({ delivery: { mode: 'free_above', freeAboveSubtotal: 50000 } })).toContain('₹500 or more');
    expect(strip({ delivery: { mode: 'free' } })).toContain('Free delivery on every order');
    expect(strip({ delivery: { mode: 'fixed', fixedFee: 4900 }, paymentMethods: [] })).toBe('');
  });
});

describe('header and footer', () => {
  const store = toStore(rawStore());
  const cats = [{ categoryId: 'c1', name: 'Earrings', slug: 'earrings', parentId: null }];

  it('the header has a menu, search, track order and cart', () => {
    const out = renderToStaticMarkup(<CartProvider><Header store={store} categories={cats} /></CartProvider>);
    expect(out).toContain('<details');
    expect(out).toContain('name="q"');
    expect(out).toContain('href="/track"');
    expect(out).toContain('href="/cart"');
    expect(out).toContain('/category/earrings');
  });

  it('the footer lists categories, the owner\'s policy pages, tracking and contact', () => {
    const withPages = toStore(rawStore({ pages: [{ slug: 'shipping-policy', title: 'Shipping Policy' }] }));
    const out = renderToStaticMarkup(<Footer store={withPages} categories={cats} />);
    expect(out).toContain('href="/pages/shipping-policy"');
    expect(out).toContain('Shipping Policy');
    expect(out).toContain('href="/category/earrings"');
    expect(out).toContain('Track order');
    expect(out).toContain('All Rights Reserved');
    expect(out).toContain('Powered by');
  });

  it('a store without branding shows no StoreKit credit', () => {
    expect(renderToStaticMarkup(<Footer store={toStore(rawStore({ poweredByBranding: false }))} categories={[]} />)).not.toContain('Powered by');
  });
});

describe('home', () => {
  it('shows Featured Categories when the store has them, and "View All" on a section', async () => {
    data.home.categories = [{ categoryId: 'c1', name: 'Earrings', slug: 'earrings', parentId: null, productCount: 3 }];
    data.home.sections = [{ type: 'featured', title: 'Featured', sortOrder: 0, products: [card()] }];
    const out = await html(Home());
    expect(out).toContain('Featured Categories');
    expect(out).toContain('/category/earrings');
    expect(out).toContain('View All');
  });

  it('has no categories section when there are none', async () => {
    expect(await html(Home())).not.toContain('Featured Categories');
  });
});

describe('owner pages', () => {
  const params = (pageSlug) => ({ params: Promise.resolve({ pageSlug }) });

  it('shows the page\'s title and its text — as text, never as markup', async () => {
    data.page = { slug: 'shipping-policy', title: 'Shipping Policy', body: 'We ship in 2 days.\n<b onmouseover=x>hi</b>' };
    const out = await html(StorePage(params('shipping-policy')));
    expect(out).toContain('Shipping Policy');
    expect(out).toContain('We ship in 2 days.');
    expect(out).not.toContain('<b onmouseover');
  });

  it('an unknown page is a 404, and an outage is unavailable', async () => {
    data.page = new ApiError({ status: 404, code: 'NOT_FOUND', message: 'nope' });
    await expect(StorePage(params('nope'))).rejects.toMatchObject({ digest: expect.stringContaining('404') });
    data.page = new ApiError({ status: 0, code: 'UNAVAILABLE', message: 'x' });
    expect(await html(StorePage(params('nope')))).toContain('not reachable right now');
  });
});

describe('track order', () => {
  const HOST = 'asha.storekit.site';
  const post = (body, origin = `https://${HOST}`) => lookup(new Request(`https://${HOST}/api/orders/lookup`, { method: 'POST', headers: { host: HOST, origin, 'content-type': 'application/json' }, body: JSON.stringify(body) }));
  beforeEach(() => { incoming = new Headers({ 'x-storekit-slug': 'asha' }); });

  it('finds an order by number and mobile, without its internal id', async () => {
    mockApi({ 'POST /public/stores/asha/orders/lookup': ok({ orderId: 'INTERNAL', orderNumber: 'ORD-000123', status: 'NEW' }) });
    const response = await post({ orderNumber: 'ord-000123', mobile: '98765 43210' });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ orderNumber: 'ORD-000123' });
    expect(body).not.toHaveProperty('orderId');
  });

  it('sends the API the order number and the mobile, nothing else', async () => {
    const calls = mockApi({ 'POST /public/stores/asha/orders/lookup': ok({ orderNumber: 'ORD-000123' }) });
    await post({ orderNumber: 'ORD-000123', mobile: '9876543210' });
    expect(JSON.parse(calls[0].init.body)).toEqual({ orderNumber: 'ORD-000123', mobile: '9876543210' });
  });

  it('needs both fields, refuses a token here and any injected field', async () => {
    const calls = mockApi({ 'POST /public/stores/asha/orders/lookup': ok({}) });
    for (const body of [{}, { orderNumber: 'ORD-000123' }, { mobile: '9876543210' }, { orderNumber: 'bad', mobile: '9876543210' }, { orderNumber: 'ORD-000123', mobile: '9876543210', businessId: 'x' }, { token: 'x' }]) {
      expect((await post(body)).status, JSON.stringify(body)).toBe(400);
    }
    expect(calls).toHaveLength(0);
  });

  it('an order that does not match is a 404 with the API\'s own words', async () => {
    mockApi({ 'POST /public/stores/asha/orders/lookup': fail(404, 'NOT_FOUND', 'We could not find an order with those details') });
    const response = await post({ orderNumber: 'ORD-000123', mobile: '9876543210' });
    expect(response.status).toBe(404);
  });

  it('refuses another site\'s page', async () => {
    mockApi({});
    expect((await post({ orderNumber: 'ORD-000123', mobile: '9876543210' }, 'https://evil.example')).status).toBe(403);
  });
});

describe('nothing about a shop is written into the storefront', () => {
  const layout = async (over) => { loaded = active(over); return html(StoreLayout({ children: null })); };

  it('the name, logo and announcement are the store\'s own, whichever store it is', async () => {
    const a = await layout({ name: 'Blue Door Books', logoUrl: 'https://cdn.test.local/blue.png', announcement: { enabled: true, text: 'Free postage this week' } });
    expect(a).toContain('alt="Blue Door Books"');
    expect(a).toContain('https://cdn.test.local/blue.png');
    expect(a).toContain('Free postage this week');

    const b = await layout({ name: 'Kite & Co', logoUrl: null, announcement: null });
    expect(b).toContain('Kite &amp; Co');
    expect(b).not.toContain('Blue Door Books');
    expect(b).not.toContain('Free postage');
    expect(b).not.toContain('sk-announcement');
  });

  it('with a logo the logo is the brand; without one the name is', async () => {
    const withLogo = await layout({ name: 'Shop', logoUrl: 'https://cdn.test.local/l.png' });
    expect(withLogo).toMatch(/class="sk-brand"[^>]*><img[^>]*alt="Shop"/);
    const without = await layout({ name: 'Shop', logoUrl: null });
    expect(without).toMatch(/class="sk-brand"[^>]*><span>Shop<\/span>/);
  });

  it('no announcement bar unless the owner turned one on', async () => {
    expect(await layout({ announcement: { enabled: false, text: 'Winter sale banner' } })).not.toContain('Winter sale banner');
  });
});

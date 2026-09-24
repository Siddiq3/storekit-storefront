import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ApiError } from '@/lib/errors.js';
import { toStore } from '@/lib/store-data.js';
import { productIdFromParam } from '@/lib/urls.js';
import { rawProduct, rawStore, ULID } from './helpers.js';

// ── What the pages read from: the current store, and the API's answers for it ─────────────────────────────────────
let loaded;
const data = { home: null, products: null, product: null, categories: [], settings: null, order: null };
const ctx = { slug: 'asha', host: 'asha.storekit.site', canonicalHost: 'asha.storekit.site', ip: null };

vi.mock('@/lib/load.js', () => ({ loadStoreOrState: async () => loaded }));
vi.mock('@/lib/store-data.js', async (original) => {
  const real = await original();
  const pick = (key) => async () => { const v = data[key]; if (v instanceof Error) throw v; return v; };
  return { ...real, getHome: pick('home'), listProducts: pick('products'), getProduct: async (_slug, _ctx, param) => { if (!productIdFromParam(param)) throw new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Product not found' }); return pick('product')(); }, getCategories: pick('categories'), getSettings: pick('settings'), lookupOrder: pick('order') };
});

const { default: StoreLayout } = await import('../app/(store)/layout.js');
const { default: Home } = await import('../app/(store)/(browse)/page.js');
const { default: ProductPage } = await import('../app/(store)/(detail)/products/[productSlug]/page.js');
const { default: CategoryPage } = await import('../app/(store)/(detail)/category/[categorySlug]/page.js');
const { default: Search } = await import('../app/(store)/(browse)/search/page.js');
const { default: CheckoutPage } = await import('../app/(store)/(detail)/checkout/page.js');
const { default: OrderSuccess } = await import('../app/(store)/(detail)/order/success/page.js');
const { StateScreen } = await import('@/components/StateScreen.jsx');
const { CartProvider } = await import('@/components/CartProvider.jsx');
const { Footer } = await import('@/components/Footer.jsx');
const { Banners } = await import('@/components/Banners.jsx');
const { ProductGrid } = await import('@/components/ProductGrid.jsx');
const { OrderView } = await import('@/components/OrderView.jsx');

const active = (over = {}) => ({ ok: true, store: toStore(rawStore(over)), ctx, canonicalHost: ctx.canonicalHost });
const html = async (element) => renderToStaticMarkup(<CartProvider>{await element}</CartProvider>);
const card = (over = {}) => ({ productId: ULID, slug: 'brake-pad', name: 'Brake Pad', price: 129900, mrp: 149900, imageUrl: 'https://cdn.test.local/p.jpg', inStock: true, hasVariants: false, ...over });

beforeEach(() => {
  loaded = active();
  Object.assign(data, { home: { store: loaded.store, categories: [], sections: [] }, products: { items: [], nextCursor: null }, product: rawProduct(), categories: [], settings: { paymentMethods: ['COD', 'UPI_MANUAL'] }, order: null });
});

describe('the store shell', () => {
  it('renders an active store: name, logo, announcement, search, cart, footer contact', async () => {
    const out = await html(StoreLayout({ children: <p>PAGE</p> }));
    expect(out).toContain('Asha Boutique');
    expect(out).toContain('https://cdn.test.local/logo.png');
    expect(out).toContain('Free delivery over ₹999');
    expect(out).toContain('name="q"');
    expect(out).toContain('href="/cart"');
    expect(out).toContain('PAGE');
    expect(out).toContain('tel:9876543210');
    expect(out).toContain('https://instagram.com/asha');
  });

  it('applies the store\'s own theme', async () => {
    const out = await html(StoreLayout({ children: null }));
    expect(out).toContain('--sk-primary:#7C3AED');
    expect(out).toContain('--sk-radius:22px');
  });

  it('never renders the internal business id', async () => {
    const out = await html(StoreLayout({ children: null }));
    expect(out).not.toContain('01HZZZZZZZZZZZZZZZZZZZZZZZ');
  });

  it('shows "Powered by StoreKit" only where the API says branding applies', async () => {
    loaded = active({ poweredByBranding: true });
    expect(await html(StoreLayout({ children: null }))).toContain('Powered by');
    loaded = active({ poweredByBranding: false });
    expect(await html(StoreLayout({ children: null }))).not.toContain('Powered by');
  });

  it('an inactive store shows the closed page and no shop chrome', async () => {
    loaded = { ok: false, state: 'inactive' };
    const out = await html(StoreLayout({ children: <p>PAGE</p> }));
    expect(out).toContain('This store is not open right now');
    expect(out).not.toContain('PAGE');
    expect(out).not.toContain('name="q"');
  });

  it.each([['store-not-found', 'We could not find this store'], ['unavailable', 'not reachable right now']])('%s has its own page', async (state, text) => {
    loaded = { ok: false, state };
    expect(await html(StoreLayout({ children: null }))).toContain(text);
  });

  it('shows a category nav when the store has categories', async () => {
    data.categories = [{ categoryId: 'c1', name: 'Kurtis', slug: 'kurtis', parentId: null }];
    const out = await html(StoreLayout({ children: null }));
    expect(out).toContain('/category/kurtis');
  });
});

describe('home', () => {
  it('shows the owner\'s sections and their products', async () => {
    data.home.sections = [{ type: 'featured', title: 'Featured picks', sortOrder: 0, products: [card()] }];
    const out = await html(Home());
    expect(out).toContain('Featured picks');
    expect(out).toContain('Brake Pad');
    expect(out).toContain('₹1,299');
    expect(out).toContain('href="/products/brake-pad--' + ULID + '"');
  });

  it('shows banners when the theme has them', async () => {
    expect(await html(Home())).toContain('https://cdn.test.local/b1.jpg');
  });

  it('a new store with no sections still shows its catalogue', async () => {
    data.products = { items: [card({ name: 'Newest Thing' })], nextCursor: null };
    expect(await html(Home())).toContain('Newest Thing');
  });

  it('an empty store says it is getting ready', async () => {
    expect(await html(Home())).toContain('getting ready');
  });

  it('says so when ordering is paused, with the owner\'s words', async () => {
    loaded = active({ orderingPaused: true, orderingPausedMessage: 'Back on Monday' });
    expect(await html(Home())).toContain('Back on Monday');
  });

  it('shows the unavailable page when the API fails', async () => {
    data.home = new ApiError({ status: 0, code: 'UNAVAILABLE', message: 'x' });
    expect(await html(Home())).toContain('not reachable right now');
  });
});

describe('products and categories', () => {
  it('a product page shows images, name, price, availability and add to cart', async () => {
    const out = await html(ProductPage({ params: Promise.resolve({ productSlug: `brake-pad--${ULID}` }) }));
    expect(out).toContain('Brake Pad');
    expect(out).toContain('https://cdn.test.local/p1-large.jpg');
    expect(out).toContain('₹1,299');
    expect(out).toContain('In stock');
    expect(out).toContain('Add to cart');
    expect(out).toContain('Long-lasting ceramic brake pads.');
    expect(out).toContain('application/ld+json');
  });

  it('a missing product is a 404, not a page', async () => {
    data.product = new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Product not found' });
    await expect(ProductPage({ params: Promise.resolve({ productSlug: `x--${ULID}` }) })).rejects.toMatchObject({ digest: expect.stringContaining('NEXT_HTTP_ERROR_FALLBACK;404') });
  });

  it('an address that is not a product address is a 404 without asking the API', async () => {
    await expect(ProductPage({ params: Promise.resolve({ productSlug: 'brake-pad' }) })).rejects.toMatchObject({ digest: expect.stringContaining('404') });
  });

  it('a wrong name part is corrected by a permanent redirect to the canonical address', async () => {
    await expect(ProductPage({ params: Promise.resolve({ productSlug: `old-name--${ULID}` }) })).rejects.toMatchObject({ digest: expect.stringContaining('NEXT_REDIRECT') });
  });

  it('an unavailable (out of stock) product says so and cannot be added', async () => {
    data.product = rawProduct({ inStock: false, stockLabel: 'out_of_stock' });
    const out = await html(ProductPage({ params: Promise.resolve({ productSlug: `brake-pad--${ULID}` }) }));
    expect(out).toContain('not available right now');
    expect(out).toMatch(/<button[^>]*disabled[^>]*>Out of stock/);
    expect(out).toContain('OutOfStock');
  });

  it('shows the API being down as unavailable, not as not found', async () => {
    data.product = new ApiError({ status: 0, code: 'UNAVAILABLE', message: 'x' });
    expect(await html(ProductPage({ params: Promise.resolve({ productSlug: `brake-pad--${ULID}` }) }))).toContain('not reachable right now');
  });

  it('a category lists its products, and an empty one says so', async () => {
    data.categories = [{ categoryId: 'c1', name: 'Kurtis', slug: 'kurtis' }];
    data.products = { items: [card()], nextCursor: 'abc' };
    let out = await html(CategoryPage({ params: Promise.resolve({ categorySlug: 'kurtis' }), searchParams: Promise.resolve({}) }));
    expect(out).toContain('Kurtis');
    expect(out).toContain('Brake Pad');
    expect(out).toContain('cursor=abc');
    data.products = { items: [], nextCursor: null };
    out = await html(CategoryPage({ params: Promise.resolve({ categorySlug: 'kurtis' }), searchParams: Promise.resolve({}) }));
    expect(out).toContain('Nothing in this category yet');
  });

  it('an unknown category is a 404', async () => {
    await expect(CategoryPage({ params: Promise.resolve({ categorySlug: 'nope' }), searchParams: Promise.resolve({}) })).rejects.toMatchObject({ digest: expect.stringContaining('404') });
  });

  it('search asks for two letters, finds results, and admits when there are none', async () => {
    expect(await html(Search({ searchParams: Promise.resolve({ q: 'a' }) }))).toContain('at least two letters');
    data.products = { items: [card()], nextCursor: null };
    expect(await html(Search({ searchParams: Promise.resolve({ q: 'brake' }) }))).toContain('Brake Pad');
    data.products = { items: [], nextCursor: null };
    expect(await html(Search({ searchParams: Promise.resolve({ q: 'zzzz' }) }))).toContain('Nothing matches');
  });

  it('search text is escaped', async () => {
    data.products = { items: [], nextCursor: null };
    const out = await html(Search({ searchParams: Promise.resolve({ q: '<img src=x onerror=alert(1)>' }) }));
    expect(out).not.toContain('<img src=x');
  });

  it('the grid follows the theme\'s layout', () => {
    expect(renderToStaticMarkup(<ProductGrid products={[card()]} layout="list" />)).toContain('data-layout="list"');
    expect(renderToStaticMarkup(<ProductGrid products={[card()]} layout="grid" />)).toContain('data-layout="grid"');
  });

  it('marks sold-out and discounted products', () => {
    expect(renderToStaticMarkup(<ProductGrid products={[card({ inStock: false })]} />)).toContain('OUT OF STOCK');
    expect(renderToStaticMarkup(<ProductGrid products={[card({ onSale: true, discountPercent: 13 })]} />)).toContain('13% off');
  });
});

describe('checkout page', () => {
  it('offers COD and UPI_MANUAL and nothing else', async () => {
    data.settings = { paymentMethods: ['COD', 'UPI_MANUAL', 'CARD', 'ONLINE'] };
    const element = await CheckoutPage();
    expect(element.props.paymentMethods).toEqual(['COD', 'UPI_MANUAL']);
  });

  it('carries the store\'s paused state to the form', async () => {
    data.settings = { paymentMethods: ['COD'], orderingPaused: true, orderingPausedMessage: 'Closed today' };
    const element = await CheckoutPage();
    expect(element.props).toMatchObject({ orderingPaused: true, pausedMessage: 'Closed today' });
  });

  it('is unavailable, not blank, when settings cannot be read', async () => {
    data.settings = new ApiError({ status: 0, code: 'UNAVAILABLE', message: 'x' });
    expect(await html(CheckoutPage())).toContain('not reachable right now');
  });
});

describe('order confirmation', () => {
  const TOKEN = '01H8XGJWBWBAQ4Z4RZ4ZQ1ZQ1Z.' + 'a'.repeat(43);
  const order = {
    orderNumber: 'ORD-000042', statusLabel: 'New', status: 'NEW', paymentMethod: 'COD', paymentStatus: 'NOT_REQUIRED', placedAt: '2026-09-24T10:00:00Z', cancelled: false,
    items: [{ name: 'Brake Pad', quantity: 2, unitPrice: 129900, lineTotal: 259800, imageUrl: 'https://cdn.test.local/t.jpg' }],
    totals: { subtotal: 259800, itemDiscount: 40000, couponDiscount: 0, deliveryFee: 5000, total: 264800 },
    address: { fullName: 'Asha Rao', mobile: '9876543210', houseNo: '12', street: 'MG Road', area: 'Indiranagar', city: 'Bengaluru', district: 'BLR', state: 'Karnataka', pincode: '560038' },
    timeline: [{ status: 'CONFIRMED', label: 'Order confirmed', done: false }], awaitingPaymentSubmission: false,
    storeName: 'Asha Boutique', storePhone: '9876543210', storeWhatsapp: '9876543210',
  };

  it('shows the order number, items, total, payment method, delivery summary and the store', async () => {
    data.order = { ...order, orderId: 'INTERNAL-ORDER-ID' };
    const out = await html(OrderSuccess({ searchParams: Promise.resolve({ t: TOKEN }) }));
    for (const text of ['ORD-000042', 'Brake Pad', '× 2', '₹2,648', 'Cash on delivery', 'Asha Rao', 'MG Road', '560038', 'Asha Boutique', 'wa.me/9876543210']) expect(out, text).toContain(text);
  });

  it('never shows the internal order id', async () => {
    data.order = { ...order, orderId: 'INTERNAL-ORDER-ID' };
    expect(await html(OrderSuccess({ searchParams: Promise.resolve({ t: TOKEN }) }))).not.toContain('INTERNAL-ORDER-ID');
  });

  it('a missing or malformed token is a 404', async () => {
    for (const t of [undefined, 'nope', `${TOKEN}x`]) {
      await expect(OrderSuccess({ searchParams: Promise.resolve({ t }) }), String(t)).rejects.toMatchObject({ digest: expect.stringContaining('404') });
    }
  });

  it('an order the store does not have is a 404', async () => {
    data.order = new ApiError({ status: 404, code: 'NOT_FOUND', message: 'nope' });
    await expect(OrderSuccess({ searchParams: Promise.resolve({ t: TOKEN }) })).rejects.toMatchObject({ digest: expect.stringContaining('404') });
  });

  it('asks for the UPI reference while payment is awaited, and not otherwise', () => {
    const waiting = renderToStaticMarkup(<OrderView order={{ ...order, paymentMethod: 'UPI_MANUAL', paymentStatus: 'PENDING_SUBMISSION', awaitingPaymentSubmission: true }} token={TOKEN} placed />);
    expect(waiting).toContain('UPI reference');
    expect(renderToStaticMarkup(<OrderView order={order} token={TOKEN} placed />)).not.toContain('UPI reference');
  });

  it('shows a cancelled order as cancelled', () => {
    expect(renderToStaticMarkup(<OrderView order={{ ...order, cancelled: true }} token={TOKEN} placed />)).toContain('was cancelled');
  });
});

describe('error and empty states', () => {
  it.each(['store-not-found', 'invalid-host', 'unavailable', 'inactive', 'product-not-found', 'product-unavailable', 'checkout-failure', 'error'])('%s', (kind) => {
    const out = renderToStaticMarkup(<StateScreen kind={kind} />);
    expect(out).toContain('<h1>');
    expect(out).toContain('role="alert"');
    expect(out).not.toMatch(/stack|Error:|undefined|at \S+\.js/i);
  });

  it('the message can be replaced, and can offer a way home', () => {
    const out = renderToStaticMarkup(<StateScreen kind="error" title="Custom" message="Words" homeLink />);
    expect(out).toContain('Custom');
    expect(out).toContain('Words');
    expect(out).toContain('Back to the shop');
  });
});

describe('what a merchant supplies is not trusted', () => {
  it('a banner link that is not https is not linked', () => {
    const out = renderToStaticMarkup(<Banners banners={[{ imageUrl: 'https://cdn.test.local/b.jpg', link: 'javascript:alert(1)', alt: 'x' }]} />);
    expect(out).not.toContain('javascript:');
    expect(out).toContain('b.jpg');
  });

  it('social links that are not https are dropped from the footer', () => {
    const store = toStore(rawStore({ social: { instagram: 'javascript:alert(1)', facebook: 'https://facebook.com/a' } }));
    const out = renderToStaticMarkup(<Footer store={store} />);
    expect(out).not.toContain('javascript:');
    expect(out).toContain('https://facebook.com/a');
  });

  it('text in the store\'s name and description is escaped', async () => {
    loaded = active({ name: '<script>alert(1)</script>', description: '<b onmouseover=x>hi</b>' });
    data.home = { store: loaded.store, categories: [], sections: [] };
    const out = await html(Home());
    expect(out).not.toContain('<script>alert(1)</script>');
    expect(out).not.toContain('<b onmouseover');
  });
});

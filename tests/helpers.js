import { vi } from 'vitest';

/** A JSON response in the API's envelope. */
export const ok = (data, meta) => new Response(JSON.stringify({ success: true, data, ...(meta ? { meta } : {}) }), { status: 200, headers: { 'content-type': 'application/json' } });

export const fail = (status, code, message = 'nope', details) =>
  new Response(JSON.stringify({ success: false, error: { code, message, ...(details ? { details } : {}) } }), { status, headers: { 'content-type': 'application/json' } });

/** Replaces fetch with a routing table: `'GET /public/hosts/resolve'` -> a function or Response. Records every call. */
export const mockApi = (routes) => {
  const calls = [];
  vi.stubGlobal('fetch', vi.fn(async (input, init = {}) => {
    const url = new URL(String(input));
    const path = url.pathname.replace(/^\/v1/, '');
    const key = `${init.method ?? 'GET'} ${path}`;
    calls.push({ key, url, init, headers: init.headers ?? {} });
    const handler = routes[key];
    if (!handler) return fail(404, 'NOT_FOUND', `no mock for ${key}`);
    return typeof handler === 'function' ? handler({ url, init }) : handler.clone();
  }));
  return calls;
};

/** A public store record as the API returns it — including the internal businessId a page must never carry. */
export const rawStore = (over = {}) => ({
  businessId: '01HZZZZZZZZZZZZZZZZZZZZZZZ',
  slug: 'asha',
  name: 'Asha Boutique',
  description: 'Handpicked ethnic wear.',
  logoUrl: 'https://cdn.test.local/logo.png',
  faviconUrl: null,
  contact: { phone: '9876543210', whatsapp: '9876543210', email: 'asha@example.test', city: 'Hyderabad' },
  theme: { primaryColor: '#7C3AED', backgroundColor: '#FFFFFF', fontFamily: 'poppins', layout: 'grid', cornerRadius: 'large' },
  banners: [{ imageUrl: 'https://cdn.test.local/b1.jpg', alt: 'Sale' }],
  announcement: { enabled: true, text: 'Free delivery over ₹999' },
  sections: [],
  social: { instagram: 'https://instagram.com/asha' },
  footerText: '',
  orderingPaused: false,
  delivery: { mode: 'free' },
  paymentMethods: ['COD', 'UPI_MANUAL'],
  poweredByBranding: true,
  ...over,
});

export const rawProduct = (over = {}) => ({
  productId: '01H8XGJWBWBAQ4Z4RZ4ZQ1ZQ1Z',
  slug: 'brake-pad',
  name: 'Brake Pad',
  summary: 'Ceramic brake pads',
  description: 'Long-lasting ceramic brake pads.\nFits most cars.',
  price: 129900,
  mrp: 149900,
  imageUrl: 'https://cdn.test.local/p1-medium.jpg',
  images: [{ url: 'https://cdn.test.local/p1-large.jpg', thumbUrl: 'https://cdn.test.local/p1-thumb.jpg', alt: 'Brake pad' }],
  inStock: true,
  stockLabel: 'in_stock',
  variantOptions: [],
  variants: [],
  ...over,
});

export const ULID = '01H8XGJWBWBAQ4Z4RZ4ZQ1ZQ1Z';

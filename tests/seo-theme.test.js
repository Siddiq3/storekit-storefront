import { describe, expect, it } from 'vitest';
import { breadcrumbLd, categoryMetadata, pageMetadata, noindex, organizationLd, productLd, productMetadata, safeJsonLd, storeMetadata, truncate } from '@/lib/seo.js';
import { parseTheme, readableOn, themeVars } from '@/lib/theme.js';
import { productIdFromParam, productPath, safeHttpsUrl, absoluteUrl } from '@/lib/urls.js';
import { rawProduct, rawStore, ULID } from './helpers.js';
import { toStore } from '@/lib/store-data.js';

const store = toStore(rawStore());
const product = rawProduct();

describe('canonical addresses', () => {
  it('a product canonicalises to the store\'s own hostname, not storekit.site', () => {
    const meta = productMetadata({ store, canonicalHost: 'asha.storekit.site', product });
    expect(meta.alternates.canonical).toBe(`https://asha.storekit.site/products/brake-pad--${ULID}`);
    expect(meta.openGraph.url).toBe(meta.alternates.canonical);
    expect(meta.alternates.canonical).not.toContain('//storekit.site');
  });

  it('a store on a custom domain canonicalises to that domain', () => {
    expect(storeMetadata({ store, canonicalHost: 'shop.example.com' }).alternates.canonical).toBe('https://shop.example.com/');
  });

  it('the canonical host is the API\'s answer: the Host the visitor used is not an input', () => {
    // absoluteUrl takes the canonical host and nothing else
    expect(absoluteUrl('asha.storekit.site', '/x')).toBe('https://asha.storekit.site/x');
  });

  it('any other public page names itself in canonical and Open Graph, not the home page', () => {
    const meta = pageMetadata({ store, canonicalHost: 'asha.storekit.site', path: '/pages/shipping-policy', title: 'Shipping — Asha', description: 'd' });
    expect(meta.alternates.canonical).toBe('https://asha.storekit.site/pages/shipping-policy');
    expect(meta.openGraph).toMatchObject({ url: 'https://asha.storekit.site/pages/shipping-policy', title: 'Shipping — Asha' });
  });

  it('a category canonicalises to /category/<slug> on its own store', () => {
    expect(categoryMetadata({ store, canonicalHost: 'asha.storekit.site', category: { name: 'Kurtis', slug: 'kurtis' } }).alternates.canonical).toBe('https://asha.storekit.site/category/kurtis');
  });
});

describe('metadata', () => {
  it('store: title, description, Open Graph and image', () => {
    const meta = storeMetadata({ store, canonicalHost: 'asha.storekit.site' });
    expect(meta.title).toBe('Asha Boutique');
    expect(meta.description).toBe('Handpicked ethnic wear.');
    expect(meta.openGraph).toMatchObject({ type: 'website', siteName: 'Asha Boutique', title: 'Asha Boutique' });
    expect(meta.openGraph.images[0].url).toBe('https://cdn.test.local/logo.png');
  });

  it('product: title includes the store, price and availability are stated', () => {
    const meta = productMetadata({ store, canonicalHost: 'asha.storekit.site', product });
    expect(meta.title).toBe('Brake Pad — Asha Boutique');
    expect(meta.description).toBe('Ceramic brake pads');
    expect(meta.other).toMatchObject({ 'product:price:amount': '1299.00', 'product:price:currency': 'INR', 'product:availability': 'in stock' });
    expect(meta.openGraph.images[0].url).toBe('https://cdn.test.local/p1-large.jpg');
    expect(productMetadata({ store, canonicalHost: 'a.b', product: rawProduct({ inStock: false }) }).other['product:availability']).toBe('out of stock');
  });

  it('falls back to a sensible description', () => {
    expect(storeMetadata({ store: { ...store, description: '' }, canonicalHost: 'a.b' }).description).toBe('Shop Asha Boutique online.');
    expect(truncate('x'.repeat(400), 160)).toHaveLength(160);
    expect(truncate('  a   b\n c ')).toBe('a b c');
  });

  it('pages that must not be indexed say so', () => {
    expect(noindex('Cart').robots).toEqual({ index: false, follow: false });
  });
});

describe('structured data', () => {
  it('describes a product with an offer priced in rupees and its availability', () => {
    const ld = productLd({ store, canonicalHost: 'asha.storekit.site', product });
    expect(ld).toMatchObject({ '@type': 'Product', name: 'Brake Pad', offers: { priceCurrency: 'INR', price: '1299.00', availability: 'https://schema.org/InStock' } });
    expect(ld.offers.url).toBe(`https://asha.storekit.site/products/brake-pad--${ULID}`);
    expect(productLd({ store, canonicalHost: 'a.b', product: rawProduct({ inStock: false }) }).offers.availability).toBe('https://schema.org/OutOfStock');
  });

  it('describes the store and the breadcrumb trail', () => {
    expect(organizationLd({ store, canonicalHost: 'asha.storekit.site' })).toMatchObject({ '@type': 'Store', name: 'Asha Boutique', url: 'https://asha.storekit.site/' });
    const trail = breadcrumbLd({ canonicalHost: 'asha.storekit.site', trail: [{ name: 'Home', path: '/' }, { name: 'Pad', path: '/products/x' }] });
    expect(trail.itemListElement.map((i) => i.position)).toEqual([1, 2]);
  });

  it('cannot break out of its script tag, whatever a merchant wrote', () => {
    const json = safeJsonLd({ name: '</script><script>alert(1)</script>' });
    expect(json).not.toContain('</script>');
    expect(JSON.parse(json).name).toContain('</script>');
  });
});

describe('addresses', () => {
  it('builds a product path with a pretty slug and the id, and reads the id back', () => {
    expect(productPath(product)).toBe(`/products/brake-pad--${ULID}`);
    expect(productPath({ productId: ULID })).toBe(`/products/${ULID}`);
    expect(productIdFromParam(`brake-pad--${ULID}`)).toBe(ULID);
    expect(productIdFromParam(ULID.toLowerCase())).toBe(ULID);
    for (const bad of ['brake-pad', '', null, `x--${ULID}extra`, '../../etc/passwd']) expect(productIdFromParam(bad), String(bad)).toBeNull();
  });

  it('uses a merchant-supplied link only if it is https', () => {
    expect(safeHttpsUrl('https://instagram.com/a')).toBe('https://instagram.com/a');
    for (const bad of ['javascript:alert(1)', 'http://x.com', 'data:text/html,x', '//x.com', 'x', '']) expect(safeHttpsUrl(bad), bad).toBeNull();
  });
});

describe('theme', () => {
  it('turns the store\'s own theme into CSS variables', () => {
    const vars = themeVars(store.theme);
    expect(vars['--sk-primary']).toBe('#7C3AED');
    expect(vars['--sk-radius']).toBe('22px');
    expect(vars['--sk-font']).toContain('--font-poppins');
    expect(vars['--sk-bg']).toBe('#FFFFFF');
  });

  it('supports every value the theme model allows', () => {
    for (const cornerRadius of ['none', 'small', 'medium', 'large']) for (const fontFamily of ['system', 'inter', 'poppins', 'dm-sans']) {
      const vars = themeVars({ cornerRadius, fontFamily });
      expect(vars['--sk-radius']).toBeTruthy();
      expect(vars['--sk-font']).toBeTruthy();
    }
  });

  it('never yields unreadable text: dark backgrounds get light text and the reverse', () => {
    expect(themeVars({ backgroundColor: '#000000' })['--sk-text']).toBe('#FFFFFF');
    expect(themeVars({ backgroundColor: '#FFFFFF' })['--sk-text']).toBe('#111827');
    expect(readableOn('#ffcc00')).toBe('#111827');
    expect(readableOn('#1e3a8a')).toBe('#FFFFFF');
  });

  it('falls back to the defaults for anything invalid, and for nothing at all', () => {
    expect(parseTheme({ primaryColor: 'red; background: url(x)' }).primaryColor).toBe('#2563EB');
    expect(parseTheme(undefined).layout).toBe('grid');
    expect(themeVars(null)['--sk-primary']).toBe('#2563EB');
  });

  it('never puts merchant text into CSS other than a validated colour', () => {
    const vars = themeVars({ primaryColor: '#123456', fontFamily: 'poppins; } body{display:none' });
    expect(Object.values(vars).join(' ')).not.toContain('display:none');
  });
});

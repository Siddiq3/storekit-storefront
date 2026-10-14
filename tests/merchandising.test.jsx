import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Banners } from '@/components/Banners.jsx';
import { Offers } from '@/components/Offers.jsx';
import { safeBannerLink } from '@/lib/urls.js';
import { toStore } from '@/lib/store-data.js';
import { rawStore } from './helpers.js';

describe('merchandising', () => {
  it('banner paths stay in the store and HTTPS links open externally', () => {
    const out = renderToStaticMarkup(<Banners banners={[
      { imageUrl: 'https://cdn.example/a.jpg', link: '/category/sarees', alt: 'Sarees' },
      { imageUrl: 'https://cdn.example/b.jpg', link: 'https://example.com', alt: 'More' },
    ]} />);
    expect(out).toMatch(/href="\/category\/sarees"(?![^>]*target=)/);
    expect(out).toContain('target="_blank"');
    expect(out).toContain('Previous banner');
    expect(out).toContain('Next banner');
    expect(out).toContain('Show banner 2');
  });
  it('no controls for one image and nothing without images', () => {
    expect(renderToStaticMarkup(<Banners banners={[]} />)).toBe('');
    expect(renderToStaticMarkup(<Banners banners={[{ imageUrl: 'https://cdn.example/a.jpg' }]} />)).not.toContain('Next banner');
  });
  it('rejects malicious or malformed banner paths', () => {
    for (const link of ['//evil.com', 'javascript:alert(1)', '/admin', '/products/../admin', '/products/%2e%2e/admin', '/products/%2fadmin', '/products/%5cadmin', '/products/%zz']) expect(safeBannerLink(link), link).toBeNull();
    for (const link of ['/products', '/products/a--01ARZ3NDEKTSV4RRFFQ69G5FAV', '/category/sarees', '/search?q=silk', '/pages/faq']) expect(safeBannerLink(link)).toBe(link);
  });
  it('offers show actual monetary conditions and selected-item scope', () => {
    const out = renderToStaticMarkup(<Offers offers={[{ code: 'FESTIVE10', type: 'percentage', value: 10, minOrderValue: 50000, maxDiscount: 10000, description: 'Festive offer', scope: 'products' }]} />);
    for (const text of ['10% off', '₹500', '₹100', 'Selected items', 'FESTIVE10', 'Copy code', 'Eligibility checked at checkout']) expect(out).toContain(text);
    expect(renderToStaticMarkup(<Offers offers={[{ code: 'SAVE50', type: 'fixed', value: 5000 }]} />)).toContain('₹50 off');
  });
  it('offers are absent for older stores and only explicit public fields reach pages', () => {
    expect(toStore(rawStore()).offers).toEqual([]);
    expect(renderToStaticMarkup(<Offers />)).toBe('');
    const raw = { code: 'X', type: 'fixed', value: 100, couponId: 'private', usedCount: 6, scope: 'all' };
    const store = toStore(rawStore({ offers: [raw, { code: 'BAD', type: 'fixed', value: -1 }] }));
    expect(store.offers).toHaveLength(1);
    expect(store.offers[0]).not.toHaveProperty('couponId');
    expect(store.offers[0]).not.toHaveProperty('usedCount');
  });
});

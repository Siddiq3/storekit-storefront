import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { clearStoreCache, getPolicy, toStore } from '@/lib/store-data.js';
import { Markdown, toBlocks } from '@/lib/markdown.jsx';
import { returnsLabel } from '@/lib/returns.js';
import { Footer } from '@/components/Footer.jsx';
import { ReturnsNote } from '@/components/ReturnsNote.jsx';
import { PolicyContent } from '@/components/PolicyContent.jsx';
import { fail, mockApi, ok, rawStore } from './helpers.js';

/**
 * Store policies on the storefront: footer links, the policy page and modal (one component),
 * the return rule under the buy button, and that nothing an owner types can become markup.
 */

const ctx = { slug: 'asha', ip: '203.0.113.7', host: 'asha.storekit.site', canonicalHost: 'asha.storekit.site' };
let loaded;
vi.mock('@/lib/load.js', () => ({ loadStoreOrState: async () => loaded }));
vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NEXT_NOT_FOUND'); },
  usePathname: () => '/',
}));
// The store a storefront API request is for comes from the middleware's headers, never the request itself.
let incoming = new Headers();
vi.mock('next/headers', () => ({ headers: async () => incoming }));

const { default: PolicyPage } = await import('../app/(store)/(detail)/policies/[policySlug]/page.js');
const { GET: policyRoute } = await import('../app/api/policies/[policySlug]/route.js');
const { PolicyLink } = await import('../components/PolicyLink.jsx');
const asStore = (slug) => { incoming = new Headers({ 'x-storekit-slug': slug, 'x-storekit-host': `${slug}.storekit.site`, 'x-storekit-canonical-host': `${slug}.storekit.site` }); };

const LINKS = [
  { type: 'privacy', slug: 'privacy-policy', title: 'Privacy Policy' },
  { type: 'refund', slug: 'refund-policy', title: 'Refund & Cancellation Policy' },
];
const PRIVACY = { type: 'privacy', slug: 'privacy-policy', title: 'Privacy Policy', content: '## What we collect\n\n- Your name\n- Your address\n\nWe **never** sell it.' };
const params = (policySlug) => Promise.resolve({ policySlug });

describe('policies on the storefront', () => {
  beforeEach(() => {
    clearStoreCache();
    loaded = { ok: true, ctx, canonicalHost: ctx.canonicalHost, store: toStore(rawStore({ policies: LINKS, returns: { allowed: true, windowDays: 7 } })) };
  });

  describe('the store record', () => {
    it('keeps only well-formed links to the four known documents', () => {
      const store = toStore(rawStore({
        policies: [
          ...LINKS,
          { type: 'payment', slug: 'payment-policy', title: 'A fifth policy' },
          { type: 'terms', slug: 'somewhere-else', title: 'Wrong address' },
          { type: 'shipping', slug: 'shipping-policy' },
          null,
        ],
      }));
      expect(store.policies).toEqual(LINKS);
    });

    it('reads the return rule, never trusting a window when returns are off', () => {
      expect(toStore(rawStore({ returns: { allowed: true, windowDays: 30 } })).returns).toEqual({ allowed: true, windowDays: 30 });
      expect(toStore(rawStore({ returns: { allowed: false, windowDays: 30 } })).returns).toEqual({ allowed: false });
      expect(toStore(rawStore({ returns: { allowed: true, windowDays: 'x' } })).returns).toEqual({ allowed: false });
      expect(toStore(rawStore()).returns).toBe(null);
    });
  });

  describe('footer', () => {
    it('lists the shown policies under Support, before the owner\'s other pages', () => {
      const out = renderToStaticMarkup(<Footer store={toStore(rawStore({ policies: LINKS, pages: [{ slug: 'faq', title: 'FAQ' }] }))} categories={[]} />);
      expect(out).toContain('>Support<');
      expect(out).toContain('href="/policies/privacy-policy"');
      expect(out).toContain('href="/policies/refund-policy"');
      expect(out.indexOf('Refund &amp; Cancellation Policy')).toBeLessThan(out.indexOf('>FAQ<'));
      expect(out).not.toContain('/policies/terms', 'a hidden policy is not listed');
      expect(out).not.toContain('/policies/shipping-policy');
    });

    it('with no policies and no pages, has no empty Support column', () => {
      const out = renderToStaticMarkup(<Footer store={toStore(rawStore({ policies: [], pages: [] }))} categories={[]} />);
      expect(out).not.toContain('>Support<');
    });
  });

  describe('loading a policy', () => {
    it('fetches the document by its address, from this store only', async () => {
      const calls = mockApi({ 'GET /public/stores/asha/policies/privacy': ok({ type: 'privacy', slug: 'privacy-policy', title: 'Privacy Policy', content: 'Asha text.' }) });
      expect(await getPolicy('asha', ctx, 'privacy-policy')).toEqual({ type: 'privacy', slug: 'privacy-policy', title: 'Privacy Policy', content: 'Asha text.' });
      expect(calls.map((c) => c.key)).toEqual(['GET /public/stores/asha/policies/privacy']);
    });

    it('two stores never share a policy through the cache', async () => {
      mockApi({
        'GET /public/stores/asha/policies/privacy': ok({ title: 'Privacy Policy', content: 'Asha text.' }),
        'GET /public/stores/demo/policies/privacy': ok({ title: 'Privacy Policy', content: 'Demo text.' }),
      });
      expect((await getPolicy('asha', ctx, 'privacy-policy')).content).toBe('Asha text.');
      expect((await getPolicy('demo', ctx, 'privacy-policy')).content).toBe('Demo text.');
      expect((await getPolicy('asha', ctx, 'privacy-policy')).content).toBe('Asha text.');
    });

    it('refuses an unknown address without asking the API', async () => {
      const calls = mockApi({});
      for (const slug of ['privacy', 'payment-policy', '../admin', 'terms/../x']) {
        await expect(getPolicy('asha', ctx, slug)).rejects.toMatchObject({ status: 404 });
      }
      expect(calls).toHaveLength(0);
    });
  });

  describe('page and modal', () => {
    it('the direct address renders the policy', async () => {
      mockApi({ 'GET /public/stores/asha/policies/privacy': ok(PRIVACY) });
      const out = renderToStaticMarkup(await PolicyPage({ params: params('privacy-policy') }));
      expect(out).toContain('<h1>Privacy Policy</h1>');
      expect(out).toContain('<h2>What we collect</h2>');
      expect(out).toContain('<li>Your name</li>');
      expect(out).toContain('<strong>never</strong>');
    });

    it('a policy link is a real link to the page, with its dialog closed until clicked', () => {
      const out = renderToStaticMarkup(<PolicyLink slug="refund-policy">Refund &amp; Cancellation Policy</PolicyLink>);
      expect(out).toContain('<a href="/policies/refund-policy">');
      expect(out).toMatch(/<dialog class="sk-modal" aria-labelledby="[^"]+">/);
      expect(out).not.toContain(' open=');
      expect(out).toContain('aria-label="Close"');
    });

    it('the dialog loads the same content as the page, for the store the request is on', async () => {
      const calls = mockApi({ 'GET /public/stores/asha/policies/privacy': ok(PRIVACY) });
      asStore('asha');
      const response = await policyRoute(new Request('https://asha.storekit.site/api/policies/privacy-policy'), { params: params('privacy-policy') });
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ slug: 'privacy-policy', title: 'Privacy Policy', content: PRIVACY.content });

      const inDialog = renderToStaticMarkup(<PolicyContent policy={body} />);
      const onPage = renderToStaticMarkup(await PolicyPage({ params: params('privacy-policy') }));
      expect(onPage).toContain(inDialog);
      expect(calls.every((c) => c.key.startsWith('GET /public/stores/asha/'))).toBe(true);
    });

    it('the dialog\'s route answers 404 for a hidden or unknown policy, or a request without a store', async () => {
      mockApi({ 'GET /public/stores/asha/policies/terms': fail(404, 'NOT_FOUND', 'Policy not found') });
      asStore('asha');
      expect((await policyRoute(new Request('https://asha.storekit.site/api/policies/terms'), { params: params('terms') })).status).toBe(404);
      expect((await policyRoute(new Request('https://asha.storekit.site/api/policies/x'), { params: params('no-such-policy') })).status).toBe(404);
      incoming = new Headers();
      expect((await policyRoute(new Request('https://asha.storekit.site/api/policies/privacy-policy'), { params: params('privacy-policy') })).status).toBe(404);
    });

    it('a hidden or missing policy is a 404 page', async () => {
      mockApi({ 'GET /public/stores/asha/policies/terms': fail(404, 'NOT_FOUND', 'Policy not found') });
      await expect(PolicyPage({ params: params('terms') })).rejects.toThrow('NEXT_NOT_FOUND');
      await expect(PolicyPage({ params: params('no-such-policy') })).rejects.toThrow('NEXT_NOT_FOUND');
    });
  });

  describe('the return rule', () => {
    it('says "[N]-day return policy" from the store\'s own window, or "No returns allowed"', () => {
      expect(returnsLabel({ allowed: true, windowDays: 30 })).toBe('30-day return policy');
      expect(returnsLabel({ allowed: true, windowDays: 7 })).toBe('7-day return policy');
      expect(returnsLabel({ allowed: false })).toBe('No returns allowed');

      const on = renderToStaticMarkup(<ReturnsNote returns={{ allowed: true, windowDays: 30 }} policy={LINKS[1]} />);
      expect(on).toContain('30-day return policy');
      expect(on).toContain('href="/policies/refund-policy"');
      expect(on).toContain('>Details</a>');

      const off = renderToStaticMarkup(<ReturnsNote returns={{ allowed: false }} />);
      expect(off).toContain('No returns allowed');
      expect(off).not.toContain('href=', 'no link to a refund policy that is hidden');
      expect(renderToStaticMarkup(<ReturnsNote returns={null} />)).toBe('');
    });
  });

  describe('owner text is only ever text', () => {
    it('renders markup, scripts and links as visible text', () => {
      const hostile = [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        '[click](javascript:alert(1))',
        '**<b>bold</b>**',
        '## <iframe src="https://evil.example">',
      ].join('\n\n');
      const out = renderToStaticMarkup(<Markdown text={hostile} />);
      // No real element and no real attribute: the words may appear, but only as escaped text.
      expect(out).not.toMatch(/<(script|img|iframe|b|a)[\s>]/i);
      expect(out).not.toMatch(/<[^>]+\s(on\w+|href|src)=/i);
      expect(out).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(out).toContain('[click](javascript:alert(1))');
    });

    it('understands the small subset owners are told about', () => {
      expect(toBlocks('# Title\n\nFirst line\nsecond line\n\n- one\n- two\n\n1. a\n2. b\n\n### Sub')).toEqual([
        { kind: 'h2', lines: ['Title'] },
        { kind: 'p', lines: ['First line', 'second line'] },
        { kind: 'ul', lines: ['one', 'two'] },
        { kind: 'ol', lines: ['a', 'b'] },
        { kind: 'h3', lines: ['Sub'] },
      ]);
      expect(renderToStaticMarkup(<Markdown text={'Line one\nLine two'} />)).toContain('Line one<br/>Line two');
      expect(toBlocks('')).toEqual([]);
    });
  });
});

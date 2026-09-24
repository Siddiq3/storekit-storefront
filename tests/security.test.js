import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import nextConfig from '../next.config.mjs';
import { matchVariant } from '@/components/AddToCart.jsx';

const root = join(import.meta.dirname, '..');

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    if (['node_modules', '.next', 'packages', 'coverage', '.git'].includes(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out); else out.push(path);
  }
  return out;
};
const sources = walk(root).filter((f) => /\.(js|jsx|mjs)$/.test(f));
const read = (f) => readFileSync(f, 'utf8');
const rel = (f) => relative(root, f);

const SERVER_ONLY = ['lib/api.js', 'lib/config.js', 'lib/store-data.js', 'lib/request.js', 'lib/bff.js', 'lib/resolver.js', 'lib/load.js', 'lib/order-page.js'];

describe('the edge secret never reaches the browser', () => {
  it('no file that runs in the browser imports a server module', () => {
    const clientFiles = sources.filter((f) => /^\s*['"]use client['"]/.test(read(f)));
    expect(clientFiles.length).toBeGreaterThan(5);
    for (const file of clientFiles) {
      const imports = [...read(file).matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
      for (const spec of imports) {
        const target = spec.replace(/^@\//, '');
        expect(SERVER_ONLY.some((s) => target.endsWith(s.replace(/^lib\//, 'lib/'))), `${rel(file)} imports ${spec}`).toBe(false);
        expect(spec, `${rel(file)}`).not.toMatch(/next\/headers|server-only/);
      }
    }
  });

  it('the secret is named in exactly one source file, and never with a NEXT_PUBLIC_ prefix', () => {
    const naming = sources.filter((f) => !/^(tests|scripts)\//.test(rel(f)) && /EDGE_SHARED_SECRET/.test(read(f)));
    expect(naming.map(rel)).toEqual(['lib/config.js']);
    for (const file of sources.concat([join(root, '.env.example')])) {
      expect(read(file), rel(file)).not.toMatch(/NEXT_PUBLIC_\w*(SECRET|EDGE|TOKEN|KEY)/);
    }
  });

  it('the header that carries it is written in one place, a server module', () => {
    const naming = sources.filter((f) => !/^(tests|scripts)\//.test(rel(f)) && /x-storekit-edge-secret/.test(read(f)));
    expect(naming.map(rel)).toEqual(['lib/api.js']);
  });

  it('Next is not configured to inline environment variables into the bundle', () => {
    expect(nextConfig).not.toHaveProperty('env');
    expect(read(join(root, 'next.config.mjs'))).not.toMatch(/process\.env\.(EDGE|API_BASE)/);
  });

  it('the browser may connect only to this storefront, so it cannot reach the StoreKit API even if it tried', async () => {
    const headers = await nextConfig.headers();
    const csp = headers.flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy').value;
    expect(csp).toMatch(/connect-src 'self'(?!\S)/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it('the browser code calls only /api/* on its own origin', () => {
    const client = read(join(root, 'lib/client-api.js'));
    expect(client).toContain("startsWith('/api/')");
    const usage = sources.filter((f) => !rel(f).startsWith('tests/')).filter((f) => /\bfetch\(/.test(read(f))).map(rel).sort();
    expect(usage).toEqual(['lib/api.js', 'lib/client-api.js']);
  });

  it('order pages are private: no caching, no indexing, no referrer', async () => {
    const headers = await nextConfig.headers();
    const order = headers.find((h) => h.source === '/order/:path*').headers.map((h) => `${h.key}: ${h.value}`).join('\n');
    expect(order).toContain('Cache-Control: no-store');
    expect(order).toContain('X-Robots-Tag: noindex');
    expect(order).toContain('Referrer-Policy: no-referrer');
  });
});

describe('no shop content is written into the source', () => {
  it('names no shop, brand or sample text: everything on a store page comes from the API', () => {
    const files = sources.filter((f) => /^(app|components|lib)\//.test(rel(f)));
    for (const file of files) {
      expect(read(file), rel(file)).not.toMatch(/demo store|sample site|test orders|lustra|xpress|asha|jewel/i);
    }
  });
});

describe('variant choice', () => {
  const product = {
    variantOptions: [{ name: 'Size', values: ['S', 'M'] }, { name: 'Colour', values: ['Red', 'Blue'] }],
    variants: [
      { variantId: 'v1', attributes: { Size: 'S', Colour: 'Red' }, inStock: true },
      { variantId: 'v2', attributes: { Size: 'M', Colour: 'Red' }, inStock: false },
    ],
  };
  it('finds the variant only when every option is chosen', () => {
    expect(matchVariant(product, { Size: 'S' })).toBeNull();
    expect(matchVariant(product, { Size: 'S', Colour: 'Red' }).variantId).toBe('v1');
    expect(matchVariant(product, { Size: 'S', Colour: 'Blue' })).toBeNull();
    expect(matchVariant({ variantOptions: [], variants: [] }, {})).toBeNull();
  });
});

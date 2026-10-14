import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PaymentAvailability } from '@/components/PaymentAvailability.jsx';
import { ValueStrip, BuyPerks } from '@/components/ValueStrip.jsx';
import { toStore } from '@/lib/store-data.js';
import { rawStore } from './helpers.js';
const fixture = vi.hoisted(() => ({ ctx: null, settings: null }));
vi.mock('@/lib/request.js', () => ({ getRequestContext: async () => fixture.ctx }));
vi.mock('@/lib/store-data.js', async (original) => ({ ...(await original()), getSettings: async () => fixture.settings }));
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
import { GET } from '../app/api/payment-methods/route.js';

beforeEach(() => { fixture.ctx = { slug: 'shop', ip: null }; fixture.settings = { paymentMethods: ['UPI_MANUAL'], upiId: 'private@bank' }; });

describe('live payment availability', () => {
  it('marks COD unavailable and removes accepted-payment badges when live settings override stale store data', () => {
    const store = toStore(rawStore({ paymentMethods: ['COD', 'UPI_MANUAL'] }));
    const out = renderToStaticMarkup(<PaymentAvailability initialMethods={['UPI_MANUAL']}><ValueStrip store={store} /><BuyPerks store={store} /></PaymentAvailability>);
    expect(out).toContain('Currently not accepted by this store.');
    expect(out).toContain('Cash on delivery is currently not accepted');
    expect(out).not.toMatch(/CASH ON DELIVERY|Cash on delivery available|pay after you receive/);
    expect(out).toContain('Pay by UPI');
  });
  it('returns only known public method names and prevents caching', async () => {
    fixture.settings.paymentMethods.push('CARD');
    const response = await GET();
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ paymentMethods: ['UPI_MANUAL'] });
    fixture.settings.paymentMethods = ['COD'];
    expect(await (await GET()).json()).toEqual({ paymentMethods: ['COD'] });
  });
  it('refuses requests without a resolved store', async () => {
    fixture.ctx = null;
    expect((await GET()).status).toBe(404);
  });
});

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DeliveryOptions, FreeDeliveryProgress } from '@/components/DeliveryOptions.jsx';

const option = (over = {}) => ({
  id: 'standard01', name: 'Standard', description: '', kind: 'delivery', primary: true, fee: 4900, deliverable: true,
  dependsOnPincode: false, freeDeliveryRemaining: 0, freeDeliveryUnlocked: false, message: 'Delivery charge',
  estimate: { type: 'days', from: '2026-10-03', to: '2026-10-05', label: 'Arrives Sat, 3 Oct – Mon, 5 Oct' }, ...over,
});
const render = (el) => renderToStaticMarkup(el);

describe('delivery options', () => {
  it('shows each method with its name, description, server price and estimate', () => {
    const out = render(<DeliveryOptions options={[
      option(),
      option({ id: 'express001', name: 'Express', description: 'Delivered today', fee: 14900, primary: false, estimate: { type: 'same_day', from: '2026-10-01', to: '2026-10-01', label: 'Arrives today' } }),
      option({ id: 'pickup0001', name: 'Pickup', kind: 'pickup', fee: 0, primary: false, estimate: null }),
    ]} selectedId="express001" onSelect={() => {}} />);
    expect(out).toContain('Standard');
    expect(out).toContain('₹49');
    expect(out).toContain('Arrives Sat, 3 Oct – Mon, 5 Oct');
    expect(out).toContain('Express');
    expect(out).toContain('Delivered today');
    expect(out).toContain('₹149');
    expect(out).toContain('Arrives today');
    expect(out).toContain('Free');
    expect(out).toMatch(/value="express001"[^>]*checked=""|checked=""[^>]*value="express001"/);
  });

  it('disables a method that cannot deliver to the address, with the reason', () => {
    const out = render(<DeliveryOptions options={[option({ deliverable: false, message: 'We do not deliver to this pincode yet' })]} selectedId="" onSelect={() => {}} />);
    expect(out).toContain('disabled=""');
    expect(out).toContain('We do not deliver to this pincode yet');
  });

  it('says when the charge still depends on the pincode', () => {
    expect(render(<DeliveryOptions options={[option({ dependsOnPincode: true })]} selectedId="" onSelect={() => {}} />))
      .toContain('Final charge depends on your pincode');
  });

  it('renders nothing without options', () => {
    expect(render(<DeliveryOptions options={[]} selectedId="" onSelect={() => {}} />)).toBe('');
  });
});

describe('free delivery progress', () => {
  it('shows the exact amount still needed, from the server', () => {
    const out = render(<FreeDeliveryProgress quote={{ subtotal: 85100, couponDiscount: 0, freeDeliveryRemaining: 14900, freeDeliveryUnlocked: false }} />);
    expect(out).toContain('Add <strong>₹149</strong> more for <strong>FREE</strong> delivery');
    expect(out).toContain('aria-valuenow="85"');
  });

  it('says FREE delivery unlocked once reached', () => {
    expect(render(<FreeDeliveryProgress quote={{ subtotal: 100000, freeDeliveryRemaining: 0, freeDeliveryUnlocked: true }} />)).toContain('FREE delivery unlocked');
  });

  it('shows nothing when the method has no free-delivery threshold', () => {
    expect(render(<FreeDeliveryProgress quote={{ subtotal: 100000, freeDeliveryRemaining: 0, freeDeliveryUnlocked: false }} />)).toBe('');
  });
});

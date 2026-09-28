import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { UpiDetails } from '@/components/UpiPanel.jsx';
import { toStore } from '@/lib/store-data.js';
import { rawStore } from './helpers.js';

/** The UPI payment details on a UPI order, with and without the owner's QR; and where UPI is offered at all. */
const upi = (over = {}) => ({ upiId: 'asha@okaxis', payeeName: 'Asha', amount: 42700, deepLink: 'upi://pay?pa=asha%40okaxis&am=427.00', ...over });

describe('UPI payment details', () => {
  it('shows the owner\'s QR to scan, with the UPI ID and the payment link', () => {
    const out = renderToStaticMarkup(<UpiDetails upi={upi({ qrImageUrl: 'https://cdn.test.local/businesses/b/qrs/q.png' })} />);
    expect(out).toContain('src="https://cdn.test.local/businesses/b/qrs/q.png"');
    expect(out).toContain('alt="UPI QR code for Asha"');
    expect(out).toContain('Scan with any UPI app to pay.');
    expect(out).toContain('asha@okaxis');
    expect(out).toContain('₹427');
    expect(out).toContain('href="upi://pay?pa=asha%40okaxis&amp;am=427.00"');
  });

  it('without a QR: the UPI ID and payment link, and no image', () => {
    const out = renderToStaticMarkup(<UpiDetails upi={upi()} />);
    expect(out).not.toContain('<img');
    expect(out).not.toContain('Scan with');
    expect(out).toContain('asha@okaxis');
    expect(out).toContain('Open my UPI app');
  });

  it('UPI is offered at checkout only when the API says so (on, with an ID)', () => {
    expect(toStore(rawStore({ paymentMethods: ['COD', 'UPI_MANUAL'] })).paymentMethods).toContain('UPI_MANUAL');
    expect(toStore(rawStore({ paymentMethods: ['COD'] })).paymentMethods).toEqual(['COD']);
    expect(JSON.stringify(toStore(rawStore()))).not.toMatch(/upiQr|qrs\//);
  });
});

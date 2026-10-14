import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AddressLocationFields } from '@/components/AddressLocationFields.jsx';
import { STATES, districtsForState, changeAddressField, restoreLocation } from '@/lib/address-locations.js';
import { addressSchema } from '@storekit/validation';

describe('checkout location selection', () => {
  it('all supplied names satisfy the API address rules', () => {
    for (const state of STATES) for (const district of districtsForState(state)) {
      const result = addressSchema.safeParse({ fullName: 'Asha Rao', mobile: '9876543210', houseNo: '12', street: 'MG Road', area: 'Central', city: 'Hyderabad', state, district, pincode: '500034' });
      expect(result.success, `${state}: ${district}`).toBe(true);
    }
    expect(STATES).toHaveLength(36);
  });
  it('filters districts by state and clears a district when the state changes', () => {
    expect(districtsForState('Telangana')).toContain('Hyderabad');
    expect(districtsForState('Maharashtra')).not.toContain('Hyderabad');
    const address = { state: 'Telangana', district: 'Hyderabad', city: 'Hyderabad', pincode: '500034' };
    expect(changeAddressField(address, 'state', 'Maharashtra')).toEqual({ ...address, state: 'Maharashtra', district: '' });
    expect(changeAddressField(address, 'state', 'Telangana').district).toBe('Hyderabad');
  });
  it('normalizes known saved names and preserves unlisted districts', () => {
    expect(restoreLocation({ state: 'TELANGANA', district: 'hyderabad' })).toEqual({ state: 'Telangana', district: 'Hyderabad' });
    expect(restoreLocation({ state: 'Telangana', district: 'New District' }).district).toBe('New District');
  });
  it('uses labelled selects and disables district until a state is chosen', () => {
    const out = renderToStaticMarkup(<AddressLocationFields values={{ state: '', district: '' }} errors={{}} onChange={() => {}} />);
    expect(out).toContain('Choose a state first');
    expect(out).toMatch(/<select[^>]*id="sk-district"[^>]*disabled=""/);
    const selected = renderToStaticMarkup(<AddressLocationFields values={{ state: 'Telangana', district: 'Hyderabad' }} errors={{}} onChange={() => {}} />);
    expect(selected).toContain('value="Hyderabad" selected=""');
    expect(selected).not.toContain('value="Pune"');
  });
  it('retains unlisted saved districts and exposes field errors', () => {
    const out = renderToStaticMarkup(<AddressLocationFields values={{ state: 'Telangana', district: 'New District' }} errors={{ district: 'Check your district' }} onChange={() => {}} />);
    expect(out).toContain('value="New District"');
    expect(out).toContain('sk-district-other');
    expect(out).toContain('aria-describedby="sk-district-err"');
  });
});

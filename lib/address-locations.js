import { INDIA_LOCATIONS } from './india-locations.js';

export const STATES = Object.keys(INDIA_LOCATIONS).sort();
const same = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
export const canonicalState = (value) => STATES.find((state) => same(state, value)) ?? value;
export const districtsForState = (state) => INDIA_LOCATIONS[canonicalState(state)] ?? [];
export const canonicalDistrict = (state, value) => districtsForState(state).find((district) => same(district, value)) ?? value;

// Keep unlisted saved district names usable; changing state requires a new district.
export const restoreLocation = (address) => ({ ...address, state: canonicalState(address.state), district: canonicalDistrict(address.state, address.district) });
export const changeAddressField = (address, name, value) => ({ ...address, [name]: value, ...(name === 'state' && value !== address.state ? { district: '' } : {}) });

'use client';

import { useState } from 'react';
import { STATES, districtsForState, canonicalDistrict } from '@/lib/address-locations.js';

const OTHER = '__other__';

export function AddressLocationFields({ values, errors, onChange }) {
  return <div className="sk-form-row">
    <div className="sk-field">
      <label htmlFor="sk-state">State / Union territory</label>
      <select id="sk-state" name="state" value={values.state} autoComplete="address-level1" onChange={(event) => onChange('state', event.target.value)} aria-invalid={errors.state ? 'true' : undefined} aria-describedby={errors.state ? 'sk-state-err' : undefined}>
        <option value="">Choose a state</option>
        {values.state && !STATES.includes(values.state) ? <option value={values.state}>{values.state} (saved)</option> : null}
        {STATES.map((state) => <option key={state} value={state}>{state}</option>)}
      </select>
      {errors.state ? <span className="sk-error" id="sk-state-err">{errors.state}</span> : null}
    </div>
    <DistrictField key={values.state} state={values.state} value={values.district} error={errors.district} onChange={(value) => onChange('district', value)} />
  </div>;
}

function DistrictField({ state, value, error, onChange }) {
  const districts = districtsForState(state);
  const normalized = canonicalDistrict(state, value);
  const [custom, setCustom] = useState(Boolean(value && !districts.includes(normalized)));
  const manual = custom || Boolean(value && !districts.includes(normalized));
  return <div className="sk-field">
    <label htmlFor="sk-district">District</label>
    <select id="sk-district" name={manual ? undefined : 'district'} value={manual ? OTHER : normalized} disabled={!state} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? 'sk-district-err' : 'sk-district-hint'} onChange={(event) => {
      const other = event.target.value === OTHER;
      setCustom(other); onChange(other ? '' : event.target.value);
    }}>
      <option value="">{state ? 'Choose a district' : 'Choose a state first'}</option>
      {districts.map((district) => <option key={district} value={district}>{district}</option>)}
      <option value={OTHER}>Enter another district</option>
    </select>
    {manual ? <>
      <label className="sk-visually-hidden" htmlFor="sk-district-other">District name</label>
      <input id="sk-district-other" name="district" value={value} maxLength={60} autoComplete="off" placeholder="Enter your district name" onChange={(event) => onChange(event.target.value)} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? 'sk-district-err' : 'sk-district-hint'} />
    </> : null}
    {error ? <span className="sk-error" id="sk-district-err">{error}</span> : <span className="sk-hint" id="sk-district-hint">{state ? 'District missing? Choose “Enter another district”.' : 'Select your state to see its districts.'}</span>}
  </div>;
}

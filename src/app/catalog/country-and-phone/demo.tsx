'use client';

import { useState } from 'react';

import { type CountryChoice, CountrySelect } from '@/components/ui/country-select';
import { Field } from '@/components/ui/form';
import { PhoneField } from '@/components/ui/phone-field';

/** En la aplicación llegan de la base; aquí, a mano. */
const SAMPLE_COUNTRIES: readonly CountryChoice[] = [
  { code: 'GT', name: 'Guatemala', phonePrefix: '+502' },
  { code: 'MX', name: 'México', phonePrefix: '+52' },
  { code: 'ES', name: 'España', phonePrefix: '+34' },
  { code: 'US', name: 'Estados Unidos', phonePrefix: '+1' },
];

export function CountryAndPhoneDemo(): React.ReactElement {
  const [countryCode, setCountryCode] = useState('GT');
  const [phone, setPhone] = useState('');
  const prefix =
    SAMPLE_COUNTRIES.find((country) => country.code === countryCode)?.phonePrefix ?? '';

  return (
    <div className="grid max-w-xl gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="catalog-country" className="block text-sm font-medium">
          País
        </label>
        <CountrySelect
          id="catalog-country"
          value={countryCode}
          options={SAMPLE_COUNTRIES}
          onChange={setCountryCode}
        />
      </div>
      <Field id="catalog-phone" label="Teléfono">
        <PhoneField id="catalog-phone" prefix={prefix} value={phone} onChange={setPhone} />
      </Field>
      <Field id="catalog-phone-error" label="Teléfono con error" error="Faltan dígitos.">
        <PhoneField
          id="catalog-phone-error"
          prefix={prefix}
          value="5555"
          onChange={() => undefined}
          hasError
        />
      </Field>
    </div>
  );
}

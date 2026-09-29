/**
 * El país y la zona horaria de un almacén.
 *
 * La zona decide la hora de sus movimientos y su corte diario (RN-014, RN-021),
 * así que tiene que ser una de las de su país.
 */

import { describe, expect, it } from 'vitest';

import { checkWarehouseLocation, timeZoneCity } from '@/modules/warehouses/service';
import type { WarehouseCountryOption } from '@/modules/warehouses/types';

const COUNTRIES: readonly WarehouseCountryOption[] = [
  { code: 'GT', name: 'Guatemala', phonePrefix: '+502', timeZones: ['America/Guatemala'] },
  {
    code: 'MX',
    name: 'Mexico',
    phonePrefix: '+52',
    timeZones: ['America/Mexico_City', 'America/Cancun'],
  },
];

describe('checkWarehouseLocation', () => {
  it('acepta una zona de su país', () => {
    expect(checkWarehouseLocation(COUNTRIES, 'MX', 'America/Cancun')).toEqual({
      ok: true,
      countryCode: 'MX',
      timeZone: 'America/Cancun',
    });
  });

  it('rechaza una zona de otro país', () => {
    expect(checkWarehouseLocation(COUNTRIES, 'GT', 'America/Cancun')).toEqual({
      ok: false,
      fieldErrors: { timeZone: 'unknownTimeZone' },
    });
  });

  it('rechaza un país que no está en el catálogo', () => {
    expect(checkWarehouseLocation(COUNTRIES, 'ES', 'Europe/Madrid')).toEqual({
      ok: false,
      fieldErrors: { countryCode: 'unknownCountry' },
    });
  });
});

describe('timeZoneCity', () => {
  it.each([
    ['America/Mexico_City', 'Mexico City'],
    ['America/Argentina/Buenos_Aires', 'Buenos Aires'],
    ['UTC', 'UTC'],
  ])('%s se lee %s', (zone, city) => {
    expect(timeZoneCity(zone)).toBe(city);
  });
});

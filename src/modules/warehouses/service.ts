/**
 * Reglas del dominio de almacenes.
 *
 * Sin Prisma y sin Next: aquí solo se decide. Lo que hace falta consultar llega
 * como argumento, de modo que estas funciones se prueban sin levantar nada.
 */

import type { WarehouseCountryOption } from './types';

/**
 * El nombre de una zona tal como lo reconoce una persona: la ciudad que la
 * representa. "America/Mexico_City" se lee "Mexico City".
 *
 * Es el último tramo del identificador, que en la base de zonas es siempre una
 * ciudad escrita con guiones bajos. Un identificador sin barra se devuelve tal
 * cual: mejor enseñarlo entero que inventar un nombre.
 */
export function timeZoneCity(timeZone: string): string {
  const city = timeZone.slice(timeZone.lastIndexOf('/') + 1);
  return city === '' ? timeZone : city.replaceAll('_', ' ');
}

export type LocationCheck =
  | { readonly ok: true; readonly countryCode: string; readonly timeZone: string }
  | { readonly ok: false; readonly fieldErrors: Readonly<Record<string, string>> };

/**
 * Si el país y la zona horaria de un almacén son una pareja válida.
 *
 * La zona manda sobre la hora que se enseña en sus movimientos y sobre su corte
 * diario de existencias (RN-014, RN-021), así que tiene que ser una de las de su
 * país: una zona de otro país pondría el corte a una hora que no corresponde a
 * ningún sitio real.
 *
 * El formulario ya solo ofrece zonas del país elegido. Se repite aquí porque la
 * acción también se puede invocar sin pasar por él.
 */
export function checkWarehouseLocation(
  countries: readonly WarehouseCountryOption[],
  countryCode: string,
  timeZone: string,
): LocationCheck {
  const country = countries.find((candidate) => candidate.code === countryCode);
  if (country === undefined) {
    return { ok: false, fieldErrors: { countryCode: 'unknownCountry' } };
  }

  if (!country.timeZones.includes(timeZone)) {
    return { ok: false, fieldErrors: { timeZone: 'unknownTimeZone' } };
  }

  return { ok: true, countryCode: country.code, timeZone };
}

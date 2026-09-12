/**
 * Los parámetros de la lista llegan de la dirección, que es texto que escribe
 * cualquiera. Estas pruebas fijan lo que pasa cuando ese texto no tiene sentido:
 * la pantalla se muestra con los valores de partida, nunca con un error.
 */

import { describe, expect, it } from 'vitest';

import { DEFAULT_PAGE_SIZE, parseOrganizationListQuery } from '@/modules/organizations/schema';

describe('parseOrganizationListQuery', () => {
  it('sin parámetros, empieza por lo más reciente y en la primera página', () => {
    expect(parseOrganizationListQuery({})).toEqual({
      search: '',
      sort: 'created',
      direction: 'desc',
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  });

  it('lee lo que viene bien escrito', () => {
    expect(
      parseOrganizationListQuery({
        q: ' ferretería ',
        sort: 'name',
        dir: 'asc',
        page: '3',
        size: '40',
      }),
    ).toEqual({
      search: 'ferretería',
      sort: 'name',
      direction: 'asc',
      page: 3,
      pageSize: 40,
    });
  });

  it('una columna de orden inventada no rompe nada', () => {
    expect(parseOrganizationListQuery({ sort: 'sueldo' }).sort).toBe('created');
  });

  it('una página negativa o absurda vuelve a la primera', () => {
    expect(parseOrganizationListQuery({ page: '-4' }).page).toBe(1);
    expect(parseOrganizationListQuery({ page: 'segunda' }).page).toBe(1);
  });

  it('un tamaño de página fuera del menú no se acepta', () => {
    // Si no, cualquiera pediría diez mil filas cambiando la dirección y la
    // consulta las traería.
    expect(parseOrganizationListQuery({ size: '10000' }).pageSize).toBe(DEFAULT_PAGE_SIZE);
  });

  it('toma el primer valor cuando un parámetro llega repetido', () => {
    expect(parseOrganizationListQuery({ sort: ['name', 'slug'] }).sort).toBe('name');
  });
});

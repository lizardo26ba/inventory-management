/**
 * El código de una empresa encabeza el número de cada documento, así que no
 * puede chocar ni cambiar. Estas pruebas fijan las dos cosas.
 */

import { describe, expect, it } from 'vitest';

import {
  buildOrganizationSlug,
  matchesTaxIdPattern,
  normalizeTaxId,
} from '@/modules/organizations/service';

describe('buildOrganizationSlug', () => {
  it('abrevia como lo haría una persona al hablar', () => {
    expect(buildOrganizationSlug('Distribuidora Central', [])).toBe('dcen');
  });

  it('se salta los conectores y la forma societaria', () => {
    // "Comercial del Norte" y "Comercial Norte" nombran a la misma empresa.
    expect(buildOrganizationSlug('Comercial del Norte', [])).toBe('cnor');
    expect(buildOrganizationSlug('Comercial Norte, Sociedad Anonima', [])).toBe('cnor');
  });

  it('ignora los acentos, porque el código viaja impreso', () => {
    expect(buildOrganizationSlug('Ferretería Progreso', [])).toBe('fpro');
  });

  it('rellena cuando el nombre no da para cuatro letras', () => {
    expect(buildOrganizationSlug('Sol', [])).toBe('solx');
  });

  it('numera el choque en lugar de alterar las letras', () => {
    // Alterarlas rompería el parecido con el nombre, que es lo que hace útil al
    // código.
    expect(buildOrganizationSlug('Distribuidora Central', ['dcen'])).toBe('dcen2');
    expect(buildOrganizationSlug('Distribuidora Central', ['dcen', 'dcen2'])).toBe('dcen3');
  });

  it('no distingue mayúsculas al comprobar los que ya están tomados', () => {
    expect(buildOrganizationSlug('Distribuidora Central', ['DCEN'])).toBe('dcen2');
  });

  it('un nombre sin letras no deja a la empresa sin código', () => {
    expect(buildOrganizationSlug('12345', [])).toBe('xxxx');
  });
});

describe('normalizeTaxId', () => {
  it('el mismo número escrito de dos formas es el mismo contribuyente', () => {
    expect(normalizeTaxId('2400237-1')).toBe(normalizeTaxId('2400237 1'));
    expect(normalizeTaxId('abc010203xy9')).toBe('ABC010203XY9');
  });
});

describe('matchesTaxIdPattern', () => {
  const NIT = '^[0-9]{2,12}-?[0-9Kk]$';

  it('acepta lo que encaja con el patrón del país', () => {
    expect(matchesTaxIdPattern('2400237-1', NIT)).toBe(true);
  });

  it('rechaza lo que no encaja', () => {
    expect(matchesTaxIdPattern('no-es-un-nit', NIT)).toBe(false);
  });

  it('un país sin patrón declarado acepta cualquier cosa', () => {
    // Preferible a rechazar capturas correctas de un país que todavía no se ha
    // estudiado.
    expect(matchesTaxIdPattern('lo-que-sea', null)).toBe(true);
  });

  it('un patrón mal escrito en el catálogo no impide dar de alta una empresa', () => {
    expect(matchesTaxIdPattern('2400237-1', '([sin cerrar')).toBe(true);
  });
});

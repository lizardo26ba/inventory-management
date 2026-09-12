/**
 * El formato del teléfono sale del catálogo de países, así que el mismo código
 * tiene que servir para un país con plantilla declarada y para otro que todavía
 * no la tiene. Estas pruebas fijan las dos situaciones.
 */

import { describe, expect, it } from 'vitest';

import { applyPhoneMask, digitsOf, isPhoneComplete, maxDigits } from '@/lib/phone';

const GUATEMALA = '#### ####';

describe('applyPhoneMask', () => {
  it('separa el número según la plantilla del país', () => {
    expect(applyPhoneMask('55554444', GUATEMALA)).toBe('5555 4444');
  });

  it('corta donde se acaban los dígitos escritos', () => {
    // Pintar la plantilla entera dejaría el cursor detrás de un espacio que
    // nadie tecleó.
    expect(applyPhoneMask('5555', GUATEMALA)).toBe('5555');
    expect(applyPhoneMask('55555', GUATEMALA)).toBe('5555 5');
  });

  it('descarta lo que sobra de la longitud del país', () => {
    expect(applyPhoneMask('5555444499', GUATEMALA)).toBe('5555 4444');
  });

  it('deja el número tal cual cuando el país no declara formato', () => {
    // Rechazar una captura correcta por un dato del catálogo que falta sería
    // peor que no separar el número.
    expect(applyPhoneMask('5555444499', '')).toBe('5555444499');
  });
});

describe('isPhoneComplete', () => {
  it('exige todos los dígitos del país', () => {
    expect(isPhoneComplete('5555 4444', GUATEMALA)).toBe(true);
    expect(isPhoneComplete('5555 44', GUATEMALA)).toBe(false);
  });

  it('no puede decir que falten dígitos si el país no declara formato', () => {
    expect(isPhoneComplete('55', '')).toBe(true);
  });
});

describe('digitsOf y maxDigits', () => {
  it('recupera los dígitos sueltos del número ya separado', () => {
    expect(digitsOf('+502 5555 4444')).toBe('50255554444');
  });

  it('cuenta los dígitos que admite la plantilla', () => {
    expect(maxDigits(GUATEMALA)).toBe(8);
    expect(maxDigits('')).toBe(0);
  });
});

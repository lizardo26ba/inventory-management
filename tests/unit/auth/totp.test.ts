/**
 * El cálculo del segundo factor, contra los vectores del RFC 6238. ADR 0014.
 *
 * Si una app autenticadora y este código no calculan lo mismo, nadie entra. Por
 * eso se fija con los valores del propio RFC y no con los que produzca el código:
 * una prueba que se compara consigo misma no descubre nada.
 */

import { describe, expect, it } from 'vitest';

import {
  buildOtpauthUri,
  encodeBase32,
  generateTotpSecret,
  hotp,
  matchTotpStep,
  TOTP_SECRET_BYTES,
  totpStepAt,
} from '@/lib/auth/totp';

/** El secreto de prueba del RFC 6238 para SHA-1. */
const RFC_SECRET = Buffer.from('12345678901234567890', 'ascii');
const RFC_DIGITS = 8;

/** Apéndice B del RFC 6238, columna SHA-1: segundos desde 1970 y código de 8 dígitos. */
const RFC_VECTORS = [
  [59, '94287082'],
  [1111111109, '07081804'],
  [1111111111, '14050471'],
  [1234567890, '89005924'],
  [2000000000, '69279037'],
  [20000000000, '65353130'],
] as const;

const SECONDS = 1000;

function at(seconds: number): Date {
  return new Date(seconds * SECONDS);
}

describe('cálculo del código', () => {
  it.each(RFC_VECTORS)('a los %i segundos da %s', (seconds, expected) => {
    expect(hotp(RFC_SECRET, totpStepAt(at(seconds)), RFC_DIGITS)).toBe(expected);
  });

  it('con seis dígitos son los seis últimos del vector', () => {
    expect(hotp(RFC_SECRET, totpStepAt(at(59)))).toBe('287082');
  });

  it('el paso cambia cada treinta segundos', () => {
    expect(totpStepAt(at(0))).toBe(0n);
    expect(totpStepAt(at(29))).toBe(0n);
    expect(totpStepAt(at(30))).toBe(1n);
  });
});

describe('aceptar un código', () => {
  const now = at(1111111111);
  const step = totpStepAt(now);
  const codeAt = (offset: bigint): string => hotp(RFC_SECRET, step + offset);

  it('acepta el del paso actual y devuelve ese paso', () => {
    expect(matchTotpStep(RFC_SECRET, codeAt(0n), now, null)).toBe(step);
  });

  it('tolera un paso a cada lado', () => {
    expect(matchTotpStep(RFC_SECRET, codeAt(-1n), now, null)).toBe(step - 1n);
    expect(matchTotpStep(RFC_SECRET, codeAt(1n), now, null)).toBe(step + 1n);
  });

  it('rechaza dos pasos lejos', () => {
    expect(matchTotpStep(RFC_SECRET, codeAt(-2n), now, null)).toBeNull();
    expect(matchTotpStep(RFC_SECRET, codeAt(2n), now, null)).toBeNull();
  });

  it('rechaza un código que no es de este secreto', () => {
    const other = Buffer.alloc(TOTP_SECRET_BYTES, 7);
    expect(matchTotpStep(other, codeAt(0n), now, null)).toBeNull();
  });

  it('rechaza repetir el código de un paso ya usado', () => {
    expect(matchTotpStep(RFC_SECRET, codeAt(0n), now, step)).toBeNull();
  });

  it('rechaza el de un paso anterior al último usado', () => {
    expect(matchTotpStep(RFC_SECRET, codeAt(-1n), now, step)).toBeNull();
  });

  it('acepta el paso siguiente al último usado', () => {
    expect(matchTotpStep(RFC_SECRET, codeAt(1n), now, step)).toBe(step + 1n);
  });

  it('rechaza un código de otro largo sin lanzar', () => {
    expect(matchTotpStep(RFC_SECRET, '123', now, null)).toBeNull();
  });
});

describe('la clave y su QR', () => {
  it('codifica en base32 sin relleno', () => {
    // Vectores del RFC 4648, sin los signos de relleno.
    expect(encodeBase32(Buffer.from('f'))).toBe('MY');
    expect(encodeBase32(Buffer.from('foobar'))).toBe('MZXW6YTBOI');
  });

  it('genera secretos de 20 bytes y distintos', () => {
    const first = generateTotpSecret();
    expect(first).toHaveLength(TOTP_SECRET_BYTES);
    expect(first.equals(generateTotpSecret())).toBe(false);
  });

  it('arma la dirección que entienden las apps', () => {
    const uri = new URL(
      buildOtpauthUri({
        issuer: 'Inventario',
        accountName: 'ana@example.test',
        secret: RFC_SECRET,
      }),
    );

    expect(uri.protocol).toBe('otpauth:');
    expect(uri.host).toBe('totp');
    expect(decodeURIComponent(uri.pathname)).toBe('/Inventario:ana@example.test');
    expect(uri.searchParams.get('secret')).toBe(encodeBase32(RFC_SECRET));
    expect(uri.searchParams.get('issuer')).toBe('Inventario');
    expect(uri.searchParams.get('digits')).toBe('6');
    expect(uri.searchParams.get('period')).toBe('30');
  });
});

/**
 * El cifrado del secreto del segundo factor. ADR 0014.
 *
 * Lo que importa no es que cifre, sino que no deje pasar nada raro: una fila
 * alterada o cifrada con otra clave tiene que fallar, nunca descifrarse en otro
 * secreto.
 */

import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { openSecret, SECRET_BOX_KEY_BYTES, sealSecret } from '@/lib/auth/secret-box';
import { InternalError } from '@/lib/errors';

const KEY = randomBytes(SECRET_BOX_KEY_BYTES);
const PLAIN = Buffer.from('secreto-de-veinte-by');

describe('cifrado del secreto', () => {
  it('descifra lo que cifró', () => {
    expect(openSecret(sealSecret(PLAIN, KEY), KEY).equals(PLAIN)).toBe(true);
  });

  it('lleva delante la versión', () => {
    expect(sealSecret(PLAIN, KEY).startsWith('v1:')).toBe(true);
  });

  it('no repite el cifrado del mismo secreto', () => {
    expect(sealSecret(PLAIN, KEY)).not.toBe(sealSecret(PLAIN, KEY));
  });

  it('no guarda el secreto a la vista', () => {
    expect(sealSecret(PLAIN, KEY)).not.toContain(PLAIN.toString('base64url'));
  });

  it('rechaza otra clave', () => {
    const sealed = sealSecret(PLAIN, KEY);
    expect(() => openSecret(sealed, randomBytes(SECRET_BOX_KEY_BYTES))).toThrow(InternalError);
  });

  it('rechaza un cifrado alterado', () => {
    const [version, iv, tag, encrypted] = sealSecret(PLAIN, KEY).split(':');
    const flipped = Buffer.from(encrypted ?? '', 'base64url');
    flipped[0] = (flipped[0] ?? 0) ^ 1;
    const tampered = [version, iv, tag, flipped.toString('base64url')].join(':');

    expect(() => openSecret(tampered, KEY)).toThrow(InternalError);
  });

  it('rechaza un formato desconocido', () => {
    expect(() => openSecret('v2:a:b:c', KEY)).toThrow(InternalError);
    expect(() => openSecret('sin-formato', KEY)).toThrow(InternalError);
  });

  it('rechaza una clave que no mide 32 bytes', () => {
    expect(() => sealSecret(PLAIN, randomBytes(16))).toThrow(InternalError);
  });
});

/**
 * Cifrado en reposo del secreto del segundo factor. ADR 0014.
 *
 * AES-256-GCM: cifra y además autentica, así que un valor alterado en la base no
 * se descifra en algo distinto, sino que falla. El vector de inicio es nuevo en
 * cada cifrado; repetirlo con la misma clave rompería GCM.
 *
 * El valor guardado es `v1:<iv>:<etiqueta>:<cifrado>`, en base64url. La versión
 * va delante para poder rotar la clave más adelante sin adivinar con cuál se
 * cifró cada fila.
 *
 * La clave llega por parámetro: este archivo no lee la configuración, y así se
 * prueba sin entorno.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { InternalError } from '@/lib/errors';

const ALGORITHM = 'aes-256-gcm';
const VERSION = 'v1';
export const SECRET_BOX_KEY_BYTES = 32;
/** 96 bits, el largo que GCM usa sin transformarlo. */
const IV_BYTES = 12;
const TAG_BYTES = 16;
const ENCODING = 'base64url';
const SEPARATOR = ':';
const PARTS = 4;

function assertKey(key: Buffer): void {
  if (key.length !== SECRET_BOX_KEY_BYTES) {
    throw new InternalError('La clave de cifrado no mide 32 bytes.');
  }
}

export function sealSecret(plain: Buffer, key: Buffer): string {
  assertKey(key);

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);

  return [
    VERSION,
    iv.toString(ENCODING),
    cipher.getAuthTag().toString(ENCODING),
    encrypted.toString(ENCODING),
  ].join(SEPARATOR);
}

/**
 * Lo descifra, o lanza. Nunca devuelve algo a medias: un formato raro, otra
 * versión o una etiqueta que no cuadra son el mismo error interno, porque
 * cualquiera de los tres significa que la fila no la escribió esta aplicación
 * con esta clave.
 */
export function openSecret(sealed: string, key: Buffer): Buffer {
  assertKey(key);

  const parts = sealed.split(SEPARATOR);
  const [version, iv, tag, encrypted] = parts;

  if (
    parts.length !== PARTS ||
    version !== VERSION ||
    iv === undefined ||
    tag === undefined ||
    encrypted === undefined
  ) {
    throw new InternalError('El secreto guardado no tiene un formato conocido.');
  }

  try {
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, ENCODING), {
      authTagLength: TAG_BYTES,
    });
    decipher.setAuthTag(Buffer.from(tag, ENCODING));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, ENCODING)), decipher.final()]);
  } catch (error) {
    throw new InternalError('No se pudo descifrar el secreto guardado.', { cause: error });
  }
}

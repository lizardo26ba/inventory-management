/**
 * Códigos de un solo uso por tiempo, según el RFC 6238. ADR 0014.
 *
 * Escrito sobre `node:crypto` y no con una biblioteca: son unas cuarenta líneas
 * de un algoritmo estable desde 2011, y los vectores del propio RFC lo comprueban
 * entero. Los parámetros son los que entienden todas las apps autenticadoras:
 * HMAC-SHA1, seis dígitos, pasos de treinta segundos. Cambiar cualquiera deja
 * fuera a alguna app.
 *
 * Funciones puras: reciben el secreto y el instante, no leen la base ni el reloj.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const TOTP_DIGITS = 6;
export const TOTP_PERIOD_SECONDS = 30;

/**
 * Cuántos pasos a cada lado del actual se aceptan. Uno tolera un teléfono con el
 * reloj desviado hasta treinta segundos, y el que alguien escriba el código justo
 * cuando cambia.
 */
export const TOTP_DRIFT_STEPS = 1;

/** 160 bits: el largo de la salida de SHA-1, que es lo que recomienda el RFC 4226. */
export const TOTP_SECRET_BYTES = 20;

const MILLISECONDS_PER_SECOND = 1000;
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const BITS_PER_BASE32_CHAR = 5;
const BITS_PER_BYTE = 8;
const COUNTER_BYTES = 8;
const DYNAMIC_OFFSET_MASK = 0x0f;
const DYNAMIC_BINARY_MASK = 0x7fffffff;
const DECIMAL_BASE = 10;

export function generateTotpSecret(): Buffer {
  return randomBytes(TOTP_SECRET_BYTES);
}

/** Base32 del RFC 4648, sin relleno: la forma en que las apps esperan la clave. */
export function encodeBase32(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of bytes) {
    value = (value << BITS_PER_BYTE) | byte;
    bits += BITS_PER_BYTE;

    while (bits >= BITS_PER_BASE32_CHAR) {
      bits -= BITS_PER_BASE32_CHAR;
      output += BASE32_ALPHABET[(value >>> bits) & 0b11111];
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (BITS_PER_BASE32_CHAR - bits)) & 0b11111];
  }

  return output;
}

/** El paso de treinta segundos en el que cae un instante. */
export function totpStepAt(instant: Date): bigint {
  return BigInt(Math.floor(instant.getTime() / MILLISECONDS_PER_SECOND / TOTP_PERIOD_SECONDS));
}

/** El código de un contador, según el RFC 4226. */
export function hotp(secret: Buffer, counter: bigint, digits: number = TOTP_DIGITS): string {
  const message = Buffer.alloc(COUNTER_BYTES);
  message.writeBigUInt64BE(counter);

  const digest = createHmac('sha1', secret).update(message).digest();
  const offset = (digest[digest.length - 1] ?? 0) & DYNAMIC_OFFSET_MASK;
  const binary = digest.readUInt32BE(offset) & DYNAMIC_BINARY_MASK;

  return (binary % DECIMAL_BASE ** digits).toString().padStart(digits, '0');
}

function sameCode(expected: string, given: string): boolean {
  const left = Buffer.from(expected);
  const right = Buffer.from(given);
  // El largo ya se comprobó en la frontera; esto evita que timingSafeEqual lance.
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * El paso al que corresponde un código, o nulo si no corresponde a ninguno
 * aceptable.
 *
 * Aceptable es dentro de la tolerancia y **posterior al último usado**. Rechazar
 * el paso ya usado es lo que impide repetir un código visto por encima del
 * hombro. Se recorren todos los pasos aunque uno coincida antes, para que el
 * tiempo de respuesta no diga en cuál acertó.
 */
export function matchTotpStep(
  secret: Buffer,
  code: string,
  instant: Date,
  lastUsedStep: bigint | null,
): bigint | null {
  const current = totpStepAt(instant);
  let matched: bigint | null = null;

  for (let drift = -TOTP_DRIFT_STEPS; drift <= TOTP_DRIFT_STEPS; drift += 1) {
    const step = current + BigInt(drift);
    const fresh = lastUsedStep === null || step > lastUsedStep;
    if (sameCode(hotp(secret, step), code) && fresh && matched === null) matched = step;
  }

  return matched;
}

/**
 * La dirección que el QR codifica. Es el formato de facto de las apps
 * autenticadoras: `otpauth://totp/Emisor:cuenta?secret=...&issuer=...`.
 */
export function buildOtpauthUri(input: {
  readonly issuer: string;
  readonly accountName: string;
  readonly secret: Buffer;
}): string {
  const label = `${encodeURIComponent(input.issuer)}:${encodeURIComponent(input.accountName)}`;
  const params = new URLSearchParams({
    secret: encodeBase32(input.secret),
    issuer: input.issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  });

  return `otpauth://totp/${label}?${params.toString()}`;
}

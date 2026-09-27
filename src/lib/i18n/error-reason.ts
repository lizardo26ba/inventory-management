/**
 * Por qué no se pudo hacer algo, en palabras de quien lo lee. RN-013.
 *
 * El servidor devuelve un código estable y nunca un texto: el texto depende del
 * idioma de quien mira. Aquí se traduce el código en la frase que ya existe en
 * el catálogo, para que el mismo rechazo se explique igual en cualquier pantalla.
 *
 * Un código sin frase propia se presenta como fallo genérico. Es deliberado: un
 * error interno no se le explica a quien lo encuentra.
 */

import type { ErrorCode } from '@/lib/errors';

import type { Copy } from './copy';

export function errorReason(copy: Copy, code: ErrorCode): string {
  switch (code) {
    case 'NOT_FOUND':
      return copy.errors.notFound;
    case 'NOT_AUTHORIZED':
      return copy.errors.notAuthorized;
    case 'NOT_AUTHENTICATED':
      return copy.errors.sessionExpired;
    case 'TWO_FACTOR_REQUIRED':
      return copy.errors.twoFactorRequired;
    case 'TOO_MANY_ATTEMPTS':
      return copy.errors.tooManyAttempts;
    case 'STALE_VERSION':
      return copy.errors.staleVersion;
    default:
      return copy.errors.generic;
  }
}

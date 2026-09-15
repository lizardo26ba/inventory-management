import 'server-only';

/**
 * De dónde viene la petición.
 *
 * Vive en `lib` y no en el módulo de autenticación porque lo necesitan dos
 * dominios que no deben depender uno del otro: la sesión, que lo guarda al
 * entrar, y la auditoría, que lo guarda en cada entrada. Si la auditoría lo
 * pidiera a autenticación, y autenticación escribe en la auditoría, quedaría un
 * ciclo de importaciones.
 */

import { headers } from 'next/headers';

export type RequestFingerprint = {
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
};

/** Para dejar constancia de dónde vino, sin fiarse de nada de eso. */
export async function requestFingerprint(): Promise<RequestFingerprint> {
  const list = await headers();

  return {
    // Lo pone el proxy y se puede falsificar, así que sirve para investigar un
    // incidente, nunca para decidir un permiso.
    ipAddress: list.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: list.get('user-agent'),
  };
}

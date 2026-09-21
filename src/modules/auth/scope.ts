import 'server-only';

/**
 * De la sesión al contexto que lee la base.
 *
 * Vive en el módulo de autenticación y no en `lib/db` por la regla de
 * dependencias: `lib` no conoce la sesión. Aquí se traduce una cosa en la otra, y
 * en un solo sitio, que es lo que exige el ADR 0005 para la excepción del super
 * administrador.
 *
 * Se llama después de autorizar, nunca antes: quien la usa ya pasó por
 * `requirePlatformPermission` o por la puerta que corresponda. Esta función no
 * decide si se puede, solo dice en qué alcance se trabaja.
 */

import { type DataScope } from '@/lib/db/scope';

import { type SessionContext } from './session-context';

/**
 * El alcance de datos de una sesión.
 *
 * Un super administrador lleva la excepción encendida aunque no haya elegido
 * empresa: sus pantallas miran por encima de todas. Cuando entra en una empresa
 * ajena, lleva además su identificador, y las dos cosas quedan en la bitácora.
 * RN-072.
 */
export function scopeOf(session: SessionContext): DataScope {
  return {
    organizationId: session.organizationId,
    actingAsPlatformAdmin: session.isPlatformAdmin,
  };
}

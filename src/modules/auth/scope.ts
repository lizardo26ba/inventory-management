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
 * `requirePlatformPermission` o por la puerta que corresponda. Estas funciones no
 * deciden si se puede, solo dicen en qué alcance se trabaja.
 *
 * Son dos y no una porque hay dos maneras de mirar los datos, y confundirlas es
 * una fuga. Las pantallas de plataforma miran por encima de todas las empresas;
 * la operación mira una sola. Un super administrador que entra en una empresa
 * trabaja en la segunda: la base le enseña esa empresa y ninguna otra, igual que
 * a un miembro. Su acceso elevado se nota en la autorización y en la bitácora, no
 * en qué filas alcanza. ADR 0013.
 */

import type { DataScope } from '@/lib/db/scope';
import { AuthorizationError } from '@/lib/errors';

import type { SessionContext } from './session-context';

/**
 * El alcance de las pantallas de plataforma: todas las empresas a la vez.
 *
 * La empresa va vacía aunque la sesión tenga una elegida. Estas pantallas no son
 * de ninguna empresa, y así lo que escriben no puede heredar por descuido la
 * empresa en la que su autor estaba trabajando. RN-072.
 */
export function platformScopeOf(session: SessionContext): DataScope {
  return {
    organizationId: null,
    // La excepción ya deja ver todo; la persona no añadiría nada.
    userId: null,
    actingAsPlatformAdmin: session.isPlatformAdmin,
  };
}

/**
 * El alcance de la operación: la empresa activa y solo ella.
 *
 * La excepción de plataforma va apagada siempre, también para un super
 * administrador. Si fuera encendida, la base le dejaría ver las filas de todas
 * las empresas desde cualquier pantalla de operación, y la única barrera sería
 * que cada consulta recordara filtrar, que es justo lo que el ADR 0010 quiso
 * dejar de necesitar.
 *
 * Sin empresa activa no hay operación posible, y pedirla así es un error de
 * programación: la puerta de la pantalla tenía que haberlo impedido antes.
 */
export function companyScopeOf(session: SessionContext): DataScope {
  if (session.organizationId === null) {
    throw new AuthorizationError('La sesión no tiene una empresa activa.');
  }

  return {
    organizationId: session.organizationId,
    // Sin la persona: con ella, la base añadiría a esta empresa lo que la persona
    // tiene en las demás, y la operación tiene que ver una sola.
    userId: null,
    actingAsPlatformAdmin: false,
  };
}

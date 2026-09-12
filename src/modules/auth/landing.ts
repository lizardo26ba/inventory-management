/**
 * A dónde va una persona nada más entrar.
 *
 * Vive en un archivo propio y sin acceso a la base porque es una decisión, no una
 * consulta: dado lo que la sesión ya sabe, qué pantalla corresponde. Repartida
 * entre pantallas, cada una acabaría decidiendo distinto y nadie sabría cuál
 * manda.
 *
 * El orden de las preguntas es el que importa:
 *
 * 1. Una contraseña puesta por otra persona bloquea todo lo demás. No es una
 *    sugerencia: mientras siga ahí, hay una credencial que conoce alguien más.
 * 2. Con empresa activa, se va a la operación de esa empresa. Es el caso normal
 *    del día a día.
 * 3. Sin empresa activa, un super administrador va a la lista de empresas, que
 *    es su punto de partida: sin empresa elegida, un resumen de existencias no
 *    significa nada.
 * 4. Cualquier otro caso es alguien que entró bien y no alcanza ninguna empresa.
 *    No es un error suyo ni un fallo del sistema: es una cuenta a la que todavía
 *    no le han concedido acceso, y hay que decírselo en lugar de dejarla ante
 *    una pantalla vacía.
 */

import { type SessionContext } from './session-context';

export type Landing =
  | { readonly kind: 'changePassword' }
  | { readonly kind: 'organizations' }
  | { readonly kind: 'company'; readonly organizationId: string }
  | { readonly kind: 'noAccess' };

export function resolveLanding(session: SessionContext): Landing {
  if (session.mustChangePassword) return { kind: 'changePassword' };
  if (session.organizationId !== null) {
    return { kind: 'company', organizationId: session.organizationId };
  }
  if (session.isPlatformAdmin) return { kind: 'organizations' };
  return { kind: 'noAccess' };
}

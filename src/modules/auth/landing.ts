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
 * 2. Un super administrador sin segundo factor superado en esta sesión no pasa
 *    de ahí: lo activa si todavía no lo tiene, o escribe el código si ya lo
 *    tiene. Va después de la contraseña a propósito: el alta se hace con una
 *    contraseña que solo conoce su dueño, no con la temporal que puso otra
 *    persona. RN-005, ADR 0014.
 * 3. Con empresa activa, se va a la operación de esa empresa. Es el caso normal
 *    del día a día.
 * 4. Sin empresa activa, un super administrador va a la lista de empresas, que
 *    es su punto de partida: sin empresa elegida, un resumen de existencias no
 *    significa nada.
 * 5. Cualquier otro caso es un miembro sin empresa activa, que elige en cuál
 *    trabajar. Quien pertenece a una sola ya entró en ella al iniciar sesión, así
 *    que aquí llega quien tiene varias, o quien salió de la suya. Si resulta que
 *    no alcanza ninguna, la pantalla de elegir se lo dice en lugar de dejarla
 *    ante una lista vacía: esta función no consulta, así que no puede saberlo.
 *    ADR 0013.
 */

import type { SessionContext } from './session-context';

export type Landing =
  | { readonly kind: 'changePassword' }
  | { readonly kind: 'twoFactorSetup' }
  | { readonly kind: 'twoFactorVerify' }
  | { readonly kind: 'organizations' }
  | { readonly kind: 'company'; readonly organizationId: string }
  | { readonly kind: 'chooseCompany' };

/**
 * `twoFactorRequired` llega de fuera porque esta función no lee la
 * configuración: así se prueba sin entorno. Desaparece con la variable que lo
 * permite apagar. Ver la enmienda del ADR 0005.
 */
export function resolveLanding(
  session: SessionContext,
  options: { readonly twoFactorRequired: boolean },
): Landing {
  if (session.mustChangePassword) return { kind: 'changePassword' };
  if (
    options.twoFactorRequired &&
    session.isPlatformAdmin &&
    session.twoFactorVerifiedAt === null
  ) {
    return { kind: session.twoFactorEnabled ? 'twoFactorVerify' : 'twoFactorSetup' };
  }
  if (session.organizationId !== null) {
    return { kind: 'company', organizationId: session.organizationId };
  }
  if (session.isPlatformAdmin) return { kind: 'organizations' };
  return { kind: 'chooseCompany' };
}

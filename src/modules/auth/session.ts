import 'server-only';

/**
 * La sesión, vista desde el servidor.
 *
 * Vive en el módulo y no en `lib/auth` por la regla de dependencias: `lib` no
 * puede importar de `modules`, y leer una sesión necesita el repositorio. En
 * `lib/auth` se queda el catálogo de permisos, que es dato puro y lo importan
 * los dos lados.
 *
 * La cookie guarda el testigo en claro y nada más. Ni el identificador de la
 * persona, ni su nombre, ni sus permisos: todo eso se vuelve a leer de la base
 * en cada petición. Es más trabajo, y es lo que permite que suspender una cuenta
 * o retirar un permiso surta efecto en el acto en lugar de cuando caduque un
 * token. Es la razón entera del ADR 0007.
 */

import { cookies, headers } from 'next/headers';

import { PERMISSIONS, type PermissionCode } from '@/lib/auth/permissions';
import { isProduction, requiresPlatformAdminTwoFactor } from '@/lib/config/env.server';
import { AuthenticationError, AuthorizationError, TwoFactorRequiredError } from '@/lib/errors';
import {
  deleteSession,
  findSessionByHash,
  type ActiveSession,
} from '@/modules/auth/repository';
import { type SessionContext } from '@/modules/auth/session-context';
import {
  hashSessionToken,
  isSessionExpired,
  SESSION_LIFETIME_MS,
} from '@/modules/auth/service';

/**
 * El prefijo `__Host-` es una instrucción al navegador: solo acepta la cookie si
 * llega por conexión segura, sin dominio declarado y con ruta raíz. Eso impide
 * que un subdominio comprometido escriba la cookie de sesión del dominio
 * principal. En desarrollo no hay conexión segura, así que ahí se usa el nombre
 * simple o el navegador la rechazaría.
 */
export const SESSION_COOKIE_NAME = isProduction ? '__Host-session' : 'session';

export type { SessionContext } from './session-context';

function toContext(session: ActiveSession): SessionContext {
  return {
    userId: session.userId,
    email: session.user.email,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    locale: session.user.locale,
    organizationId: session.organizationId,
    isPlatformAdmin: session.user.isPlatformAdmin,
    actingAsPlatformAdmin: session.actingAsPlatformAdmin,
    twoFactorVerifiedAt: session.twoFactorVerifiedAt,
    mustChangePassword: session.user.mustChangePassword,
  };
}

export async function writeSessionCookie(token: string): Promise<void> {
  const store = await cookies();

  store.set(SESSION_COOKIE_NAME, token, {
    // Fuera del alcance de cualquier script de la página: si un ataque logra
    // ejecutar código en el navegador, no se lleva la sesión.
    httpOnly: true,
    secure: isProduction,
    // Estricto cortaría la vuelta desde un enlace externo; laxo basta para
    // frenar el envío de formularios desde otro sitio.
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSION_LIFETIME_MS / 1000),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

/**
 * Quién está pidiendo esto, o nadie.
 *
 * Una sesión caducada se borra al encontrarla. Dejarla ahí llenaría la tabla de
 * filas muertas y daría una segunda oportunidad a un testigo que ya no vale.
 */
export async function getSession(): Promise<SessionContext | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (token === undefined || token === '') return null;

  const session = await findSessionByHash(hashSessionToken(token));
  if (session === null) return null;

  if (isSessionExpired(session.expiresAt)) {
    await deleteSession(session.tokenHash);
    return null;
  }

  // Una cuenta suspendida conserva su fila de sesión pero deja de valer. No se
  // borra: si se levanta la suspensión, la persona sigue teniendo su sesión.
  if (session.user.status === 'SUSPENDED') return null;

  return toContext(session);
}

/**
 * Lo mismo, pero exigiéndola.
 *
 * Es la puerta que usa toda operación de servidor. Negar por defecto significa
 * que una pantalla o una acción nueva no está protegida por acordarse de
 * comprobar algo, sino porque no puede leer nada sin pasar por aquí.
 */
export async function requireSession(): Promise<SessionContext> {
  const session = await getSession();
  if (session === null) throw new AuthenticationError('No hay sesión activa.');
  return session;
}

/** Para dejar en la sesión de dónde vino, sin fiarse de nada de eso. */
export async function requestFingerprint(): Promise<{
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}> {
  const list = await headers();

  return {
    // Lo pone el proxy y se puede falsificar, así que sirve para investigar un
    // incidente, nunca para decidir un permiso.
    ipAddress: list.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    userAgent: list.get('user-agent'),
  };
}

/**
 * La puerta del super administrador.
 *
 * Dos condiciones, no una. Ser super administrador da el acceso transversal; el
 * segundo factor es lo que confirma que quien lo usa es quien dice ser, y no
 * alguien sentado frente a una sesión abierta. El ADR 0005 exige las dos.
 *
 * La segunda se puede saltar mientras las pantallas de alta y de verificación
 * del segundo factor no existan, y eso incluye producción. No es un agujero
 * escondido: la variable se escribe a mano, lleva por omisión el valor seguro, y
 * el arranque avisa en el registro allí donde está apagada. Es temporal y se
 * retira con las pantallas. Ver la enmienda del ADR 0005.
 */
export async function requirePlatformAdmin(): Promise<SessionContext> {
  const session = await requireSession();

  if (!session.isPlatformAdmin) {
    throw new AuthorizationError('La sesión no es de un super administrador.');
  }

  if (requiresPlatformAdminTwoFactor && session.twoFactorVerifiedAt === null) {
    throw new TwoFactorRequiredError('Falta superar el segundo factor en esta sesión.');
  }

  return session;
}

/**
 * Exige un permiso de plataforma.
 *
 * Los permisos de plataforma no se conceden por rol: los tiene quien es super
 * administrador, y solo mientras la concesión siga viva. Por eso la comprobación
 * es la misma puerta de arriba más la certeza de que el código pedido es de
 * alcance de plataforma, que se resuelve contra el catálogo y no contra una
 * cadena escrita a mano.
 *
 * Pedir un permiso inexistente no compila, porque el tipo del parámetro sale del
 * propio catálogo.
 */
export async function requirePlatformPermission(code: PermissionCode): Promise<SessionContext> {
  const permission = PERMISSIONS.find((candidate) => candidate.code === code);

  if (permission === undefined || permission.scope !== 'PLATFORM') {
    // No es un fallo de quien pide, es un error de programación: se pidió un
    // permiso de empresa por la puerta de la plataforma.
    throw new AuthorizationError(`El permiso ${code} no es de alcance de plataforma.`, {
      context: { code },
    });
  }

  return requirePlatformAdmin();
}

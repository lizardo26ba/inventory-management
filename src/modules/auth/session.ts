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

import { cookies } from 'next/headers';

import { PERMISSIONS, type PermissionCode } from '@/lib/auth/permissions';
import { isProduction, requiresPlatformAdminTwoFactor } from '@/lib/config/env.server';
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  TwoFactorRequiredError,
} from '@/lib/errors';
import { everyOrganizationPermission } from '@/modules/auth/company-access';
import {
  deleteSession,
  findEnterableOrganization,
  findLiveMembershipCompany,
  findSessionByHash,
  listCompanyChoices,
  listCompanyPermissions,
  type ActiveSession,
} from '@/modules/auth/repository';
import type { SessionContext } from '@/modules/auth/session-context';
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
    twoFactorEnabled: session.user.twoFactorEnabled,
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

  // Retirar el acceso a la empresa corta la sesión en la petición siguiente, y la
  // sesión se borra: vuelve a entrar quien todavía pueda. RN-006.
  if (!(await companyAccessIsLive(session))) {
    await deleteSession(session.tokenHash);
    return null;
  }

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

type PlatformAdminVerdict = 'GRANTED' | 'NOT_PLATFORM_ADMIN' | 'TWO_FACTOR_MISSING';

/**
 * La puerta del super administrador, contestada una sola vez.
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
 *
 * Contesta en lugar de lanzar porque hay dos preguntas distintas sobre lo mismo:
 * cerrarle el paso a quien no puede, y saber de antemano qué ofrecerle a quien
 * sí. Si cada una escribiera su propia comprobación acabarían discrepando, y ese
 * desacuerdo se vería como un menú que ofrece lo que luego se rechaza, o peor,
 * que esconde lo que en realidad estaba permitido. Por eso la regla del auditor
 * de seguridad: ninguna comprobación de super administrador fuera de este punto.
 * Aquí está, y las puertas de abajo se limitan a traducir el veredicto.
 */
function judgePlatformAdmin(session: SessionContext): PlatformAdminVerdict {
  if (!session.isPlatformAdmin) return 'NOT_PLATFORM_ADMIN';

  if (requiresPlatformAdminTwoFactor && session.twoFactorVerifiedAt === null) {
    return 'TWO_FACTOR_MISSING';
  }

  return 'GRANTED';
}

export async function requirePlatformAdmin(): Promise<SessionContext> {
  const session = await requireSession();
  assertPlatformVerdict(session);
  return session;
}

/**
 * Que el código pedido sea de alcance de plataforma.
 *
 * Se resuelve contra el catálogo y no contra una cadena escrita a mano. Pedir un
 * permiso inexistente ni siquiera compila, porque el tipo del parámetro sale del
 * propio catálogo.
 */
function assertPlatformScope(code: PermissionCode): void {
  const permission = PERMISSIONS.find((candidate) => candidate.code === code);

  if (permission === undefined || permission.scope !== 'PLATFORM') {
    // No es un fallo de quien pide, es un error de programación: se pidió un
    // permiso de empresa por la puerta de la plataforma.
    throw new AuthorizationError(`El permiso ${code} no es de alcance de plataforma.`, {
      context: { code },
    });
  }
}

/**
 * Exige un permiso de plataforma.
 *
 * Los permisos de plataforma no se conceden por rol: los tiene quien es super
 * administrador, y solo mientras la concesión siga viva. Por eso la comprobación
 * es la misma puerta de arriba, más la certeza de que el permiso pedido es de
 * los que esa puerta abre.
 */
export async function requirePlatformPermission(code: PermissionCode): Promise<SessionContext> {
  assertPlatformScope(code);

  return requirePlatformAdmin();
}

/**
 * La misma puerta, respondiendo en lugar de cerrar.
 *
 * Sirve para decidir qué se dibuja, nunca para decidir si algo se ejecuta. Lo
 * segundo es siempre `requirePlatformPermission`, en el servidor, dentro de la
 * pantalla o de la acción. Esconder una opción es una cortesía; lo que autoriza
 * es la comprobación que lanza.
 *
 * Recibe la sesión en lugar de leerla porque quien pregunta ya la tiene: el
 * diseño del panel la lee una vez y pregunta por cada sección, en lugar de
 * volver a la base tantas veces como entradas tenga el menú.
 */
export function holdsPlatformPermission(
  session: SessionContext,
  code: PermissionCode,
): boolean {
  assertPlatformScope(code);

  return judgePlatformAdmin(session) === 'GRANTED';
}

// ---------------------------------------------------------------------------
// La empresa activa. ADR 0013.
//
// Viven aquí y no en otro archivo por la regla del ADR 0005: ninguna comprobación
// de super administrador fuera de este punto. Entrar a una empresa pregunta si
// quien entra lo es, y por eso se decide aquí.
// ---------------------------------------------------------------------------

/**
 * Si la empresa de la sesión sigue siendo alcanzable. RN-006.
 *
 * La plataforma depende de su concesión, que ya viene leída con la sesión. Un
 * miembro, de su membresía, que se vuelve a leer en cada petición: retirarla
 * tiene que cortar el acceso en la siguiente, no al caducar la sesión.
 */
async function companyAccessIsLive(session: ActiveSession): Promise<boolean> {
  if (session.organizationId === null) return true;
  if (session.actingAsPlatformAdmin) return session.user.isPlatformAdmin;

  return (await findLiveMembershipCompany(session.userId, session.organizationId)) !== null;
}

/**
 * La sesión que pueden usar las pantallas del segundo factor: la de un super
 * administrador. RN-005, ADR 0014.
 *
 * No pide el factor superado, porque es justo donde se supera. Tampoco lo
 * rechaza: volver a verificar no da nada que la sesión no tuviera.
 */
export async function requireTwoFactorChallenge(): Promise<SessionContext> {
  const session = await requireSession();

  if (!session.isPlatformAdmin) {
    throw new AuthorizationError('El segundo factor es solo del super administrador.');
  }

  return session;
}

/** Traduce el veredicto de la plataforma a la excepción que cierra el paso. */
function assertPlatformVerdict(session: SessionContext): void {
  const verdict = judgePlatformAdmin(session);

  if (verdict === 'NOT_PLATFORM_ADMIN') {
    throw new AuthorizationError('La sesión no es de un super administrador.');
  }

  if (verdict === 'TWO_FACTOR_MISSING') {
    throw new TwoFactorRequiredError('Falta superar el segundo factor en esta sesión.');
  }
}

/** Una sesión dentro de una empresa, con lo que puede hacer en ella. */
export type CompanySession = SessionContext & {
  readonly organizationId: string;
  readonly permissions: ReadonlySet<PermissionCode>;
};

/**
 * La puerta de toda pantalla y acción de la operación.
 *
 * Exige empresa activa. Un super administrador dentro de ella tiene cualquier
 * permiso de empresa, pero solo mientras su puerta de plataforma siga abierta,
 * con el segundo factor incluido. Un miembro tiene los de sus roles, sin segundo
 * factor: RN-005 solo lo pide al super administrador. ADR 0014.
 */
export async function requireCompanySession(): Promise<CompanySession> {
  const session = await requireSession();
  const organizationId = session.organizationId;

  if (organizationId === null) {
    throw new AuthorizationError('La sesión no tiene una empresa activa.');
  }

  if (session.actingAsPlatformAdmin) {
    assertPlatformVerdict(session);
    return { ...session, organizationId, permissions: everyOrganizationPermission() };
  }

  const permissions = new Set(await listCompanyPermissions(session.userId, organizationId));

  return { ...session, organizationId, permissions };
}

function assertOrganizationScope(code: PermissionCode): void {
  const permission = PERMISSIONS.find((candidate) => candidate.code === code);

  if (permission === undefined || permission.scope !== 'ORGANIZATION') {
    throw new AuthorizationError(`El permiso ${code} no es de alcance de empresa.`, {
      context: { code },
    });
  }
}

/** Exige un permiso de empresa en la empresa activa. */
export async function requireCompanyPermission(code: PermissionCode): Promise<CompanySession> {
  assertOrganizationScope(code);

  const session = await requireCompanySession();
  if (!session.permissions.has(code)) {
    throw new AuthorizationError(`Falta el permiso ${code}.`, { context: { code } });
  }

  return session;
}

/**
 * Lo mismo, respondiendo. Para decidir qué se dibuja, nunca qué se ejecuta: eso
 * es siempre `requireCompanyPermission`.
 */
export function holdsCompanyPermission(session: CompanySession, code: PermissionCode): boolean {
  assertOrganizationScope(code);

  return session.permissions.has(code);
}

/** A qué empresa se entra y en qué calidad, ya autorizado. */
export type CompanyEntry = {
  readonly company: { readonly id: string; readonly name: string };
  readonly actingAsPlatformAdmin: boolean;
  /** El permiso que autorizó la entrada, para la bitácora. */
  readonly permissionCode: PermissionCode | null;
};

/**
 * Si un miembro puede entrar en una empresa, y a cuál.
 *
 * Una membresía que no existe, que se revocó o cuya empresa se desactivó da lo
 * mismo: no encontrada. Distinguirlas diría qué empresas existen.
 */
export async function authorizeMemberEntry(
  member: Pick<SessionContext, 'userId'>,
  organizationId: string,
): Promise<CompanyEntry> {
  const company = await findLiveMembershipCompany(member.userId, organizationId);
  if (company === null) throw new NotFoundError('No hay acceso a esa empresa.');

  return { company, actingAsPlatformAdmin: false, permissionCode: null };
}

/**
 * Entrar en una empresa desde la sesión actual.
 *
 * Un super administrador entra siempre como plataforma, aunque además sea
 * miembro: así el distintivo y la bitácora no dependen de si alguna vez le dieron
 * un rol. Lo autoriza el permiso de plataforma de entrar, que es lo que la
 * bitácora registra. ADR 0013.
 */
export async function authorizeCompanyEntry(
  session: SessionContext,
  organizationId: string,
): Promise<CompanyEntry> {
  if (!session.isPlatformAdmin) return authorizeMemberEntry(session, organizationId);

  const permissionCode: PermissionCode = 'platform.organization:enter';
  assertPlatformScope(permissionCode);
  assertPlatformVerdict(session);

  const company = await findEnterableOrganization(organizationId);
  if (company === null) throw new NotFoundError('La empresa no existe.');

  return { company, actingAsPlatformAdmin: true, permissionCode };
}

/**
 * La empresa en la que entra sola una persona al iniciar sesión, si la hay.
 *
 * Solo quien pertenece a una única empresa: con varias hay que elegir, y la
 * plataforma empieza en su lista. ADR 0013.
 */
export async function authorizeAutomaticEntry(user: {
  readonly userId: string;
  readonly isPlatformAdmin: boolean;
}): Promise<CompanyEntry | null> {
  if (user.isPlatformAdmin) return null;

  const [only, ...others] = await listCompanyChoices(user.userId);
  if (only === undefined || others.length > 0) return null;

  return authorizeMemberEntry(user, only.organizationId);
}

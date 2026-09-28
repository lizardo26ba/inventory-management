'use server';

/**
 * Server Actions de autenticación.
 *
 * Delgadas a propósito: validan, delegan y traducen el resultado. Ninguna regla
 * vive aquí. Si una acción crece más allá de eso, lo que creció pertenece al
 * servicio.
 *
 * Devuelven un resultado en lugar de lanzar, porque el formulario necesita
 * pintar el error junto a su campo y una excepción que cruza la frontera del
 * servidor llega al cliente como un texto genérico y sin estructura.
 */

import { redirect } from 'next/navigation';

import { toErrorPayload, type ErrorPayload } from '@/lib/errors';
import { logger } from '@/lib/observability/logger';
import { buildAuditContext } from '@/modules/audit';
import { AuthenticationError } from '@/lib/errors';
import {
  deleteSession,
  deleteSessionsOfUser,
  enterCompanySession,
  findPasswordHash,
  findSignInCandidate,
  leaveCompanySession,
  openSession,
  registerFailedAttempt,
  updatePassword,
} from '@/modules/auth/repository';
import {
  changePasswordSchema,
  enterCompanySchema,
  signInSchema,
  toFieldErrors,
  twoFactorCodeSchema,
} from '@/modules/auth/schema';
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  isLockedOut,
  nextLockoutState,
  verifyPassword,
} from '@/modules/auth/service';
import { SIGN_IN_PATH, SIGNED_IN_PATH } from '@/modules/auth/routes';
import {
  authorizeAutomaticEntry,
  authorizeCompanyEntry,
  clearSessionCookie,
  requireSession,
  requireTwoFactorChallenge,
  SESSION_COOKIE_NAME,
  writeSessionCookie,
  type CompanyEntry,
} from '@/modules/auth/session';

import { cookies } from 'next/headers';

import { submitTwoFactorCode, type TwoFactorPurpose } from '@/modules/auth/two-factor';

export type ActionResult =
  { readonly ok: true } | { readonly ok: false; readonly error: ErrorPayload };

/**
 * Traduce el fallo para la pantalla y lo deja escrito en el registro.
 *
 * Las dos cosas, siempre. Devolver el código sin registrar convierte un fallo en
 * un misterio para quien lo investiga; registrar sin devolver deja a quien lo
 * provocó mirando una pantalla que no reacciona.
 */
function failed(operation: string, error: unknown): ActionResult {
  logger.failure(`auth.${operation}`, error);
  return { ok: false, error: toErrorPayload(error) };
}

/** La huella del testigo de la petición en curso. Sin testigo no hay sesión que cambiar. */
async function currentTokenHash(): Promise<string> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (token === undefined || token === '')
    throw new AuthenticationError('No hay sesión activa.');
  return hashSessionToken(token);
}

/**
 * Pasa la sesión a una empresa ya autorizada y devuelve el testigo nuevo, que es
 * el que tiene que ir en la cookie: el anterior deja de valer. ADR 0007.
 */
async function rotateIntoCompany(
  userId: string,
  fromTokenHash: string,
  entry: CompanyEntry,
): Promise<string> {
  const next = createSessionToken();
  const actor = {
    userId,
    organizationId: entry.company.id,
    actingAsPlatformAdmin: entry.actingAsPlatformAdmin,
  };

  await enterCompanySession(
    {
      currentTokenHash: fromTokenHash,
      nextTokenHash: next.tokenHash,
      organizationId: entry.company.id,
      actingAsPlatformAdmin: entry.actingAsPlatformAdmin,
    },
    await buildAuditContext(actor, entry.permissionCode),
  );

  return next.token;
}

/** Quien todavía no es nadie: un intento de entrar no tiene autor. */
const ANONYMOUS = { userId: null, organizationId: null, actingAsPlatformAdmin: false } as const;

/**
 * Entrar.
 *
 * El resultado no distingue entre correo desconocido, contraseña equivocada y
 * cuenta suspendida. Las tres devuelven lo mismo, porque diferenciarlas
 * convierte esta pantalla en un buscador de cuentas registradas. El bloqueo por
 * intentos sí se dice, porque quien está bloqueado necesita saber que esperar es
 * la solución y que no se equivocó de contraseña.
 */
export async function signIn(input: unknown): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_FAILED', fieldErrors: toFieldErrors(parsed.error) },
    };
  }

  try {
    const now = new Date();
    const candidate = await findSignInCandidate(parsed.data.email);

    if (candidate !== null && isLockedOut(candidate.lockedUntil, now)) {
      return { ok: false, error: { code: 'TOO_MANY_ATTEMPTS' } };
    }

    // Se verifica siempre, incluso sin candidato, para que entrar tarde lo mismo
    // exista la cuenta o no.
    const passwordMatches = await verifyPassword(
      parsed.data.password,
      candidate?.passwordHash ?? null,
    );

    if (candidate === null || !passwordMatches || candidate.status === 'SUSPENDED') {
      if (candidate !== null) {
        await registerFailedAttempt(
          candidate,
          nextLockoutState(candidate.failedLoginAttempts, now),
          await buildAuditContext(ANONYMOUS, null),
        );
      }
      return { ok: false, error: { code: 'NOT_AUTHENTICATED' } };
    }

    const token = createSessionToken(now);
    const audit = await buildAuditContext(
      { userId: candidate.id, organizationId: null, actingAsPlatformAdmin: false },
      null,
    );

    await openSession(
      {
        userId: candidate.id,
        email: candidate.email,
        tokenHash: token.tokenHash,
        expiresAt: token.expiresAt,
        signedInAt: now,
        // La huella de la petición ya se leyó para la bitácora. La sesión guarda
        // la misma, no una segunda lectura.
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent,
      },
      audit,
    );

    // Quien pertenece a una sola empresa entra directo en ella. Es un segundo
    // paso, con su propia entrada en la bitácora, porque entrar en la cuenta y
    // entrar en una empresa son hechos distintos. ADR 0013.
    const entry = await authorizeAutomaticEntry({
      userId: candidate.id,
      isPlatformAdmin: candidate.isPlatformAdmin,
    });
    const sessionToken =
      entry === null
        ? token.token
        : await rotateIntoCompany(candidate.id, token.tokenHash, entry);

    await writeSessionCookie(sessionToken);
  } catch (error) {
    return failed('signIn', error);
  }

  // Fuera del try: redirect funciona lanzando, y atraparlo lo convertiría en un
  // fallo interno que nunca navega.
  redirect(SIGNED_IN_PATH);
}

/**
 * Cambiar la contraseña.
 *
 * Cierra las demás sesiones de esa persona. Quien cambia su contraseña suele
 * hacerlo porque teme que alguien la sepa, y dejar abiertas las sesiones que ese
 * alguien tuviera vacía el gesto de sentido.
 */
export async function changePassword(input: unknown): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_FAILED', fieldErrors: toFieldErrors(parsed.error) },
    };
  }

  try {
    const session = await requireSession();
    const currentHash = await findPasswordHash(session.userId);

    if (!(await verifyPassword(parsed.data.currentPassword, currentHash))) {
      return {
        ok: false,
        error: { code: 'VALIDATION_FAILED', fieldErrors: { currentPassword: 'wrongPassword' } },
      };
    }

    await updatePassword(
      { id: session.userId, email: session.email },
      await hashPassword(parsed.data.newPassword),
      await buildAuditContext(session, null),
    );

    const store = await cookies();
    const token = store.get(SESSION_COOKIE_NAME)?.value;
    await deleteSessionsOfUser(session.userId, {
      exceptTokenHash: token === undefined ? undefined : hashSessionToken(token),
    });
  } catch (error) {
    return failed('changePassword', error);
  }

  redirect(SIGNED_IN_PATH);
}

export async function signOut(): Promise<void> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE_NAME)?.value;

    if (token !== undefined && token !== '') {
      await deleteSession(hashSessionToken(token));
    }

    await clearSessionCookie();
  } catch (error) {
    // Salir nunca falla de cara a quien lo pide: si la fila ya no estaba, el
    // resultado buscado ya se cumplió. La cookie se borra igualmente, pero el
    // fallo queda escrito porque una sesión que no se pudo borrar sí importa.
    logger.failure('auth.signOut', error);
    await clearSessionCookie();
  }

  redirect(SIGN_IN_PATH);
}

/**
 * Entrar en una empresa, o cambiar a otra.
 *
 * Quién entra y con qué alcance lo decide el servidor con la sesión. Del
 * navegador solo llega cuál. Si ya había una empresa, la sesión pasa de una a
 * otra en un solo paso. RN-001, RN-004.
 */
export async function enterCompany(input: unknown): Promise<ActionResult> {
  const parsed = enterCompanySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_FAILED', fieldErrors: toFieldErrors(parsed.error) },
    };
  }

  try {
    const session = await requireSession();
    const entry = await authorizeCompanyEntry(session, parsed.data.organizationId);
    const token = await rotateIntoCompany(session.userId, await currentTokenHash(), entry);
    await writeSessionCookie(token);
  } catch (error) {
    return failed('enterCompany', error);
  }

  redirect(SIGNED_IN_PATH);
}

/**
 * Salir de la empresa: la plataforma vuelve a su lista y un miembro a su
 * selector. No pide permiso, porque dejar de ver algo nunca es un riesgo.
 *
 * Es la acción de un formulario del marco, así que no devuelve un resultado:
 * si falla, el fallo queda en el registro y sube hasta la pantalla de error, que
 * es donde se le explica a la persona. Callarlo la dejaría dentro de una empresa
 * creyendo que salió.
 */
export async function leaveCompany(): Promise<void> {
  try {
    const session = await requireSession();

    if (session.organizationId !== null) {
      const next = createSessionToken();
      await leaveCompanySession(
        {
          currentTokenHash: await currentTokenHash(),
          nextTokenHash: next.tokenHash,
          organizationId: session.organizationId,
        },
        await buildAuditContext(session, null),
      );
      await writeSessionCookie(next.token);
    }
  } catch (error) {
    logger.failure('auth.leaveCompany', error);
    throw error;
  }

  redirect(SIGNED_IN_PATH);
}

/**
 * Comprueba el código del segundo factor y traduce lo que responde.
 *
 * Si vale, la sesión rotó y el testigo nuevo va a la cookie. Si la cuenta quedó
 * bloqueada, la sesión ya se cerró y la cookie se borra: seguir escribiendo
 * códigos no tiene sentido hasta que pase el bloqueo.
 */
async function submitCode(
  operation: string,
  purpose: TwoFactorPurpose,
  input: unknown,
): Promise<ActionResult> {
  const parsed = twoFactorCodeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: { code: 'VALIDATION_FAILED', fieldErrors: toFieldErrors(parsed.error) },
    };
  }

  try {
    const session = await requireTwoFactorChallenge();
    const outcome = await submitTwoFactorCode({
      session,
      purpose,
      code: parsed.data.code,
      currentTokenHash: await currentTokenHash(),
      audit: await buildAuditContext(session, null),
    });

    switch (outcome.kind) {
      case 'ACCEPTED':
        await writeSessionCookie(outcome.token);
        break;
      case 'LOCKED':
        await clearSessionCookie();
        return { ok: false, error: { code: 'TOO_MANY_ATTEMPTS' } };
      case 'INVALID':
        return {
          ok: false,
          error: { code: 'VALIDATION_FAILED', fieldErrors: { code: 'invalidTwoFactorCode' } },
        };
      case 'WRONG_STATE':
        return { ok: false, error: { code: 'CONFLICT' } };
    }
  } catch (error) {
    return failed(operation, error);
  }

  redirect(SIGNED_IN_PATH);
}

/** Confirma el alta del segundo factor con el primer código de la app. ADR 0014. */
export async function confirmTwoFactorSetup(input: unknown): Promise<ActionResult> {
  return submitCode('confirmTwoFactorSetup', 'CONFIRM_SETUP', input);
}

/** Supera el segundo factor en esta sesión. RN-005. */
export async function verifyTwoFactor(input: unknown): Promise<ActionResult> {
  return submitCode('verifyTwoFactor', 'VERIFY', input);
}

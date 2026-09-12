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
import {
  createSession,
  deleteSession,
  deleteSessionsOfUser,
  findPasswordHash,
  findSignInCandidate,
  registerFailedAttempt,
  registerSuccessfulSignIn,
  updatePassword,
} from '@/modules/auth/repository';
import { changePasswordSchema, signInSchema, toFieldErrors } from '@/modules/auth/schema';
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
  clearSessionCookie,
  requestFingerprint,
  requireSession,
  SESSION_COOKIE_NAME,
  writeSessionCookie,
} from '@/modules/auth/session';

import { cookies } from 'next/headers';

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
          candidate.id,
          nextLockoutState(candidate.failedLoginAttempts, now),
        );
      }
      return { ok: false, error: { code: 'NOT_AUTHENTICATED' } };
    }

    const token = createSessionToken(now);
    const fingerprint = await requestFingerprint();

    await createSession({
      userId: candidate.id,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      ...fingerprint,
    });
    await registerSuccessfulSignIn(candidate.id, now);
    await writeSessionCookie(token.token);
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

    await updatePassword(session.userId, await hashPassword(parsed.data.newPassword));

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

import 'server-only';

/**
 * El segundo factor del super administrador, de punta a punta. RN-005, ADR 0014.
 *
 * Aquí se junta lo que ninguna otra pieza sabe sola: el repositorio guarda y
 * lee, `lib/auth/totp` calcula, `lib/auth/secret-box` cifra, y la configuración
 * tiene la clave. Las acciones solo traducen lo que esto responde.
 *
 * Tres estados, que la base defiende con restricciones: sin alta, pendiente de
 * confirmar y activo. El alta crea el pendiente; el primer código válido lo
 * activa; restablecer lo devuelve a sin alta.
 */

import QRCode from 'qrcode';

import { openSecret, sealSecret } from '@/lib/auth/secret-box';
import {
  buildOtpauthUri,
  encodeBase32,
  generateTotpSecret,
  matchTotpStep,
} from '@/lib/auth/totp';
import { clientEnv } from '@/lib/config/env.client';
import { isProduction, twoFactorEncryptionKey } from '@/lib/config/env.server';
import { NotFoundError } from '@/lib/errors';
import type { AuditContext } from '@/modules/audit';

import {
  acceptTwoFactorCode,
  deleteSession,
  findTwoFactorState,
  registerFailedAttempt,
  savePendingTwoFactorSecret,
  type TwoFactorState,
} from './repository';
import { createSessionToken, isLockedOut, nextLockoutState } from './service';
import type { SessionContext } from './session-context';

/** El nombre con que la cuenta aparece en la app autenticadora. */
const TWO_FACTOR_ISSUER = 'Inventario';

/** La clave se enseña de cuatro en cuatro, que es como se teclea en un teléfono. */
const MANUAL_KEY_GROUP = 4;

/**
 * Fuera de producción el emisor lleva el nombre del entorno. Sin eso, quien
 * tiene cuenta en desarrollo y en producción ve dos entradas iguales en su app y
 * escribe el código de la que no es.
 */
function issuer(): string {
  return isProduction
    ? TWO_FACTOR_ISSUER
    : `${TWO_FACTOR_ISSUER} (${clientEnv.environmentLabel})`;
}

function groupKey(secret: Buffer): string {
  const key = encodeBase32(secret);
  const groups: string[] = [];
  for (let start = 0; start < key.length; start += MANUAL_KEY_GROUP) {
    groups.push(key.slice(start, start + MANUAL_KEY_GROUP));
  }
  return groups.join(' ');
}

async function requireState(userId: string): Promise<TwoFactorState> {
  const state = await findTwoFactorState(userId);
  if (state === null) throw new NotFoundError('La cuenta ya no existe.');
  return state;
}

export type TwoFactorSetup = {
  /** El QR ya dibujado, en SVG. El secreto no llega al navegador de otra forma. */
  readonly qrSvg: string;
  /** La misma clave en texto, para quien no puede escanear. */
  readonly manualKey: string;
};

/**
 * Lo que enseña la pantalla de alta, creando el alta pendiente si no la hay.
 *
 * Volver a la pantalla con una pendiente enseña la misma: un QR ya escaneado
 * sigue sirviendo. Con el factor ya activo no hay nada que enseñar, y devuelve
 * nulo: activar otra vez sería cambiar de teléfono sin pasar por quien lo
 * autoriza, que es restablecer.
 */
export async function loadTwoFactorSetup(
  session: SessionContext,
): Promise<TwoFactorSetup | null> {
  let state = await requireState(session.userId);
  if (state.enabledAt !== null) return null;

  if (state.sealedSecret === null) {
    await savePendingTwoFactorSecret(
      session.userId,
      sealSecret(generateTotpSecret(), twoFactorEncryptionKey),
    );
    // Se vuelve a leer en lugar de usar el recién creado: si otra pestaña ganó
    // la escritura, el que vale es el suyo.
    state = await requireState(session.userId);
  }

  if (state.sealedSecret === null) {
    throw new NotFoundError('El alta del segundo factor no se pudo preparar.');
  }

  const secret = openSecret(state.sealedSecret, twoFactorEncryptionKey);
  const uri = buildOtpauthUri({ issuer: issuer(), accountName: state.email, secret });

  return {
    qrSvg: await QRCode.toString(uri, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }),
    manualKey: groupKey(secret),
  };
}

/** Qué espera quien manda el código: confirmar un alta o verificar un factor activo. */
export type TwoFactorPurpose = 'CONFIRM_SETUP' | 'VERIFY';

export type TwoFactorOutcome =
  /** Aceptado. La sesión rotó y este es el testigo nuevo. */
  | { readonly kind: 'ACCEPTED'; readonly token: string }
  /** Código equivocado, fuera de tiempo o ya usado. */
  | { readonly kind: 'INVALID' }
  /** Demasiados intentos: la cuenta queda bloqueada y la sesión, cerrada. */
  | { readonly kind: 'LOCKED' }
  /** El estado no es el que esta pantalla espera: ya activo, o sin alta. */
  | { readonly kind: 'WRONG_STATE' };

function expectedState(state: TwoFactorState, purpose: TwoFactorPurpose): boolean {
  if (state.sealedSecret === null) return false;
  return purpose === 'CONFIRM_SETUP' ? state.enabledAt === null : state.enabledAt !== null;
}

/**
 * Comprueba un código y, si vale, deja la sesión verificada.
 *
 * Un código equivocado cuenta como una contraseña equivocada: suma al mismo
 * contador y dispara el mismo bloqueo. Quien ya tiene la contraseña no gana
 * intentos ilimitados por estar en el segundo paso. Al bloquearse, la sesión a
 * medio verificar se cierra.
 *
 * Un código repetido se rechaza dos veces: aquí, porque su paso no es posterior
 * al último usado, y en la escritura, por si otra petición lo aceptó entre
 * medias. Las dos cuentan como intento fallido.
 */
export async function submitTwoFactorCode(input: {
  readonly session: SessionContext;
  readonly purpose: TwoFactorPurpose;
  readonly code: string;
  readonly currentTokenHash: string;
  readonly audit: AuditContext;
}): Promise<TwoFactorOutcome> {
  const now = new Date();
  const { session } = input;
  const state = await requireState(session.userId);

  if (isLockedOut(state.lockedUntil, now)) {
    await deleteSession(input.currentTokenHash);
    return { kind: 'LOCKED' };
  }

  if (!expectedState(state, input.purpose) || state.sealedSecret === null) {
    return { kind: 'WRONG_STATE' };
  }

  const secret = openSecret(state.sealedSecret, twoFactorEncryptionKey);
  const step = matchTotpStep(secret, input.code, now, state.lastUsedStep);

  if (step !== null) {
    const next = createSessionToken(now);
    const accepted = await acceptTwoFactorCode(
      {
        userId: session.userId,
        email: state.email,
        step,
        activates: input.purpose === 'CONFIRM_SETUP',
        verifiedAt: now,
        currentTokenHash: input.currentTokenHash,
        nextTokenHash: next.tokenHash,
      },
      input.audit,
    );

    if (accepted) return { kind: 'ACCEPTED', token: next.token };
  }

  const lockout = nextLockoutState(state.failedLoginAttempts, now);
  await registerFailedAttempt({ id: session.userId, email: state.email }, lockout, input.audit);

  if (lockout.lockedUntil !== null) {
    await deleteSession(input.currentTokenHash);
    return { kind: 'LOCKED' };
  }

  return { kind: 'INVALID' };
}

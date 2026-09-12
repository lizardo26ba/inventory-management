import 'server-only';

/**
 * Reglas de autenticación.
 *
 * Nada de Next aquí dentro y ningún acceso a Prisma: esto es lo que decide, y el
 * repositorio es quien guarda. Así las reglas se pueden probar sin levantar una
 * base ni un servidor.
 *
 * Tres decisiones que conviene leer antes de tocar nada:
 *
 * 1. El testigo de sesión en claro solo existe en la cookie. En la base se
 *    guarda su huella, calculada con la clave de firma. Quien se lleve una copia
 *    de la tabla de sesiones no puede fabricar una cookie válida con ella,
 *    porque le falta la clave, que vive en el gestor de secretos y no en la base.
 * 2. Entrar tarda lo mismo exista la cuenta o no. Argon2 es deliberadamente
 *    lento, así que responder rápido cuando el correo no existe delataría qué
 *    correos están registrados con solo cronometrar.
 * 3. El mensaje de credenciales inválidas es uno solo. Distinguir entre correo
 *    desconocido y contraseña equivocada convierte la pantalla de entrada en un
 *    buscador de cuentas.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { hash, verify } from '@node-rs/argon2';

import { serverEnv } from '@/lib/config/env.server';

/**
 * Parámetros de Argon2id recomendados por OWASP para uso interactivo. La semilla
 * usa los mismos: si cambian aquí, cambian allí.
 */
export const ARGON2_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

/** Bytes de azar del testigo de sesión. 32 bytes son 256 bits. */
const SESSION_TOKEN_BYTES = 32;

/**
 * Cuánto vive una sesión. Doce horas cubre una jornada larga sin obligar a
 * entrar dos veces, y deja fuera al portátil que se queda abierto el fin de
 * semana.
 */
export const SESSION_LIFETIME_MS = 12 * 60 * 60 * 1000;

/** Intentos fallidos seguidos antes de bloquear. */
export const MAX_FAILED_ATTEMPTS = 5;

/** Cuánto dura el bloqueo. Suficiente para frenar a una máquina, corto para una persona. */
export const LOCKOUT_MS = 15 * 60 * 1000;

/**
 * Huella de una contraseña inexistente, para gastar el mismo tiempo cuando el
 * correo no está registrado. Se calcula una vez al arrancar.
 */
let decoyHashPromise: Promise<string> | null = null;

function decoyHash(): Promise<string> {
  decoyHashPromise ??= hash(randomBytes(32).toString('hex'), ARGON2_OPTIONS);
  return decoyHashPromise;
}

export function hashPassword(plainPassword: string): Promise<string> {
  return hash(plainPassword, ARGON2_OPTIONS);
}

/**
 * Comprueba una contraseña contra su huella.
 *
 * Cuando no hay huella, porque el correo no existe, verifica igualmente contra
 * una huella señuelo y devuelve falso. El trabajo es el mismo y el reloj no
 * cuenta nada.
 */
export async function verifyPassword(
  plainPassword: string,
  passwordHash: string | null,
): Promise<boolean> {
  if (passwordHash === null) {
    await verify(await decoyHash(), plainPassword, ARGON2_OPTIONS).catch(() => false);
    return false;
  }

  try {
    return await verify(passwordHash, plainPassword, ARGON2_OPTIONS);
  } catch {
    // Una huella corrupta o de un formato viejo no es una contraseña válida, y
    // tampoco es motivo para tumbar la petición.
    return false;
  }
}

export type SessionToken = {
  /** Lo que viaja en la cookie. No se guarda en ninguna parte. */
  readonly token: string;
  /** Lo que se guarda en la tabla de sesiones. */
  readonly tokenHash: string;
  readonly expiresAt: Date;
};

export function createSessionToken(now: Date = new Date()): SessionToken {
  const token = randomBytes(SESSION_TOKEN_BYTES).toString('base64url');

  return {
    token,
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS),
  };
}

export function hashSessionToken(token: string): string {
  return createHmac('sha256', serverEnv.AUTH_SECRET).update(token).digest('hex');
}

/**
 * Compara dos huellas en tiempo constante.
 *
 * La búsqueda en base ya va por índice único, así que esto cubre el resto de
 * comparaciones, donde un `===` filtraría por el reloj cuántos caracteres
 * coinciden.
 */
export function sessionHashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function isLockedOut(lockedUntil: Date | null, now: Date = new Date()): boolean {
  return lockedUntil !== null && lockedUntil.getTime() > now.getTime();
}

/**
 * Qué hacer tras un intento fallido: cuántos van, y hasta cuándo queda
 * bloqueada la cuenta si se llegó al tope.
 */
export function nextLockoutState(
  currentAttempts: number,
  now: Date = new Date(),
): { readonly failedLoginAttempts: number; readonly lockedUntil: Date | null } {
  const failedLoginAttempts = currentAttempts + 1;

  return {
    failedLoginAttempts,
    lockedUntil:
      failedLoginAttempts >= MAX_FAILED_ATTEMPTS ? new Date(now.getTime() + LOCKOUT_MS) : null,
  };
}

export function isSessionExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

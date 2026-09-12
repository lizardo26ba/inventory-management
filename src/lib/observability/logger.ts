import 'server-only';

/**
 * Registro de la aplicación.
 *
 * Una línea por suceso, en JSON. No es por gusto: en cuanto esto corra en un
 * contenedor, quien lea los registros será una máquina, y un mensaje con saltos
 * de línea y colores se vuelve ingrato de consultar. En desarrollo se lee
 * igual de bien en la consola.
 *
 * Tres reglas que este archivo impone y no se pueden esquivar desde fuera:
 *
 * 1. Nunca se escribe el objeto de configuración, ni nada cuya clave suene a
 *    secreto. La lista de abajo enmascara por nombre de clave, así que un dato
 *    sensible que llegue por descuido sale tapado en lugar de sin tapar.
 * 2. El nivel se decide con la configuración, no con un interruptor repartido
 *    por el código.
 * 3. Un error se registra con su causa completa. Perder la causa es lo que
 *    convierte un fallo en un misterio, que es justo lo que el principio 6 de
 *    CLAUDE.md prohíbe.
 */

import { serverEnv } from '@/lib/config/env.server';
import { toAppError } from '@/lib/errors';

const LEVELS = ['error', 'warn', 'info', 'debug'] as const;
export type LogLevel = (typeof LEVELS)[number];

/**
 * Claves cuyo valor nunca se escribe. Se comparan en minúsculas y por
 * coincidencia parcial, para que `userPassword` y `password_hash` caigan igual
 * que `password`.
 */
const MASKED_KEY_FRAGMENTS = [
  'password',
  'secret',
  'token',
  'authorization',
  'cookie',
  'apikey',
  'api_key',
  'connectionstring',
  'database_url',
  'hash',
];

const MASK = '[oculto]';

function isMasked(key: string): boolean {
  const lower = key.toLowerCase();
  return MASKED_KEY_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

export type LogFields = Readonly<Record<string, unknown>>;

/**
 * Recorre el objeto tapando lo sensible. Limita la profundidad porque un dato
 * que llega del exterior puede venir anidado sin fin, y un registrador no puede
 * ser el sitio donde la petición se cuelga.
 */
function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[demasiado anidado]';
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redact(item, depth + 1));
  if (value instanceof Date) return value.toISOString();

  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    out[key] = isMasked(key) ? MASK : redact(inner, depth + 1);
  }
  return out;
}

function shouldWrite(level: LogLevel): boolean {
  return LEVELS.indexOf(level) <= LEVELS.indexOf(serverEnv.LOG_LEVEL);
}

function write(level: LogLevel, message: string, fields: LogFields): void {
  if (!shouldWrite(level)) return;

  const line = JSON.stringify({
    at: new Date().toISOString(),
    level,
    message,
    ...(redact(fields) as Record<string, unknown>),
  });

  // Avisos y errores van por la salida de error, que es donde los busca quien
  // depura y lo que la mayoría de recolectores separa por su cuenta.
  if (level === 'error' || level === 'warn') console.error(line);
  else console.warn(line);
}

export const logger = {
  debug: (message: string, fields: LogFields = {}): void => write('debug', message, fields),
  info: (message: string, fields: LogFields = {}): void => write('info', message, fields),
  warn: (message: string, fields: LogFields = {}): void => write('warn', message, fields),

  /**
   * Registra un fallo con su causa.
   *
   * Lo esperado, como un permiso que falta, se anota como aviso: es
   * funcionamiento normal y no debería despertar a nadie de madrugada. Lo demás
   * es un error de verdad.
   */
  failure: (message: string, thrown: unknown, fields: LogFields = {}): void => {
    const error = toAppError(thrown);
    const cause = error.cause;

    write(error.isOperational ? 'warn' : 'error', message, {
      ...fields,
      ...error.context,
      code: error.code,
      error: error.message,
      stack: error.isOperational ? undefined : error.stack,
      cause: cause instanceof Error ? cause.message : cause,
    });
  },
} as const;

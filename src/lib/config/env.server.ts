import 'server-only';

/**
 * Configuración y secretos de servidor.
 *
 * Este archivo y `env.client.ts` son los dos únicos del proyecto autorizados a
 * leer `process.env`. El analizador estático lo impone: fuera de esta carpeta,
 * tocar el entorno falla al construir. Ver
 * `docs/standards/configuration-and-secrets.md`.
 *
 * Importa `server-only`, así que un componente de cliente que intente traerlo
 * rompe la compilación en lugar de filtrar una cadena de conexión al navegador.
 *
 * Todo se valida al arrancar. Si falta una variable o tiene formato inválido, el
 * proceso no inicia y el mensaje dice cuál es. No hay arranque degradado con
 * valores inventados: una aplicación que arranca sin saber a qué base apunta
 * encuentra el problema mucho más tarde y mucho peor.
 */

import { z } from 'zod';

/** Lo que `openssl rand -base64 32` produce, medido en caracteres. */
const MINIMUM_SECRET_LENGTH = 32;

/**
 * El valor de ejemplo de `.env.example`. Se rechaza por su nombre porque llegar
 * a producción con él significaría que todas las instalaciones firman sus
 * cookies con la misma clave pública del repositorio.
 */
const PLACEHOLDER_SECRET = 'reemplaza-esto-por-un-valor-generado-de-32-bytes';

/** AES-256 necesita una clave de exactamente 32 bytes. ADR 0014. */
const ENCRYPTION_KEY_BYTES = 32;

/** El valor de ejemplo de la clave del segundo factor, rechazado por la misma razón. */
const PLACEHOLDER_ENCRYPTION_KEY = 'reemplaza-esto-por-32-bytes-en-base64';

function decodesToKey(value: string): boolean {
  return Buffer.from(value, 'base64').length === ENCRYPTION_KEY_BYTES;
}

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Dos roles distintos por mínimo privilegio: la aplicación solo lee y escribe
  // datos, el migrador es el único que puede alterar la estructura.
  DATABASE_URL: z.string().min(1),
  DIRECT_DATABASE_URL: z.string().min(1),
  TEST_DATABASE_URL: z.string().min(1).optional(),

  AUTH_SECRET: z
    .string()
    .min(MINIMUM_SECRET_LENGTH)
    .refine((value) => value !== PLACEHOLDER_SECRET, {
      message: 'sigue teniendo el valor de ejemplo; genera uno con openssl rand -base64 32',
    }),
  AUTH_URL: z.string().min(1),

  /**
   * Clave que cifra el secreto del segundo factor en la base. 32 bytes en
   * base64. Sin ella, robar la base no basta para generar códigos. Perderla deja
   * inservibles todos los segundos factores. ADR 0014.
   */
  TWO_FACTOR_ENCRYPTION_KEY: z
    .string()
    .refine((value) => value !== PLACEHOLDER_ENCRYPTION_KEY, {
      message: 'sigue teniendo el valor de ejemplo; genera uno con openssl rand -base64 32',
    })
    .refine(decodesToKey, {
      message: 'tiene que ser base64 de 32 bytes: openssl rand -base64 32',
    }),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  SECRETS_PROVIDER: z.enum(['azure', 'aws', 'env']).default('env'),
  SECRETS_NAME: z.string().optional(),
});

export type ServerEnvironment = Readonly<z.infer<typeof serverSchema>>;

/**
 * El mensaje nombra las variables, nunca sus valores: este texto acaba en la
 * consola de arranque y en los registros del contenedor.
 */
function describeFailure(error: z.ZodError): string {
  const details = error.issues
    .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  return `Configuración de servidor inválida. Revisa tu .env contra .env.example:\n${details}`;
}

function readServerEnvironment(): ServerEnvironment {
  const result = serverSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error(describeFailure(result.error));
  }

  // Congelado tras validarse: nadie lo cambia en caliente, así que lo que se
  // leyó al arrancar es lo que rige durante toda la vida del proceso.
  return Object.freeze(result.data);
}

export const serverEnv: ServerEnvironment = readServerEnvironment();

export const isProduction = serverEnv.NODE_ENV === 'production';

/** La clave del segundo factor, ya decodificada. Solo la usa el módulo de autenticación. */
export const twoFactorEncryptionKey: Buffer = Buffer.from(
  serverEnv.TWO_FACTOR_ENCRYPTION_KEY,
  'base64',
);
export const isTest = serverEnv.NODE_ENV === 'test';

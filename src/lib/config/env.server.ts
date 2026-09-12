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

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  SECRETS_PROVIDER: z.enum(['azure', 'aws', 'env']).default('env'),
  SECRETS_NAME: z.string().optional(),

  /**
   * Si el super administrador debe superar un segundo factor antes de entrar a
   * una empresa. El ADR 0005 lo exige; esta variable permite saltarlo mientras
   * las pantallas de alta y de verificación del segundo factor todavía no
   * existen.
   *
   * Por omisión está exigido, en todos los entornos. Apagarlo hay que
   * escribirlo, y donde se apague queda dicho en el registro de arranque. Ver la
   * enmienda del ADR 0005.
   */
  PLATFORM_ADMIN_TWO_FACTOR: z.enum(['required', 'skipped']).default('required'),
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
export const isTest = serverEnv.NODE_ENV === 'test';

/**
 * Si hay que exigir el segundo factor al super administrador.
 *
 * Manda la variable, en todos los entornos, y su valor por omisión es exigirlo.
 * Antes producción lo imponía sin mirar la variable, y eso dejaba el despliegue
 * bloqueado sin salida: la puerta pide una marca que ninguna pantalla puede
 * poner todavía, así que toda pantalla de plataforma respondía con un error.
 *
 * Es una concesión con fecha de caducidad, no un permiso permanente. Se retira
 * en cuanto existan las pantallas de alta y de verificación, y entonces esta
 * variable desaparece. Ver la enmienda del ADR 0005.
 */
export const requiresPlatformAdminTwoFactor =
  serverEnv.PLATFORM_ADMIN_TWO_FACTOR === 'required';

// Que se vea en el registro de arranque, y con más voz en producción. Un control
// de seguridad apagado no puede ser algo que solo sepa quien editó la
// configuración del despliegue.
if (!requiresPlatformAdminTwoFactor) {
  console.warn(
    isProduction
      ? '[configuración] PRODUCCIÓN con el segundo factor del super administrador SALTADO. Concesión temporal mientras no existen sus pantallas. Ver la enmienda del ADR 0005.'
      : '[configuración] Segundo factor del super administrador SALTADO. Ver ADR 0005.',
  );
}

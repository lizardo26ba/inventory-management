/**
 * Jerarquía de errores de la aplicación.
 *
 * Un error lleva un código estable, nunca un texto para el usuario. El texto
 * depende del idioma de quien mira y ese dato no existe en la capa de negocio;
 * además, un mensaje escrito dentro del servicio se acaba mostrando tal cual en
 * la pantalla y ahí es donde se filtran nombres de tabla y de columna. La
 * interfaz traduce el código; el servidor solo dice qué pasó.
 *
 * La distinción que importa es entre lo esperado y lo que no. Un error operativo
 * es parte del funcionamiento normal: faltó un permiso, el dato ya existía, la
 * sesión caducó. Se le muestra a quien lo provocó y no despierta a nadie. Todo
 * lo demás es un fallo, se registra con su causa y sale al usuario como un
 * mensaje genérico, porque el detalle de un fallo interno no es asunto suyo.
 *
 * La causa nunca se pierde: viaja en `cause`, que es lo que el registrador
 * escribe y lo que permite reconstruir qué ocurrió sin adivinar.
 */

export const ERROR_CODES = [
  /** El dato no pasó el esquema de la frontera. */
  'VALIDATION_FAILED',
  /** No hay sesión, o caducó. */
  'NOT_AUTHENTICATED',
  /** Hay sesión, pero le falta el permiso. */
  'NOT_AUTHORIZED',
  /** El segundo factor todavía no se ha superado en esta sesión. */
  'TWO_FACTOR_REQUIRED',
  /** Hay que cambiar la contraseña antes de hacer cualquier otra cosa. */
  'PASSWORD_CHANGE_REQUIRED',
  /** No existe, o existe pero fuera del alcance de quien pregunta. */
  'NOT_FOUND',
  /** Choca con algo que ya está: una clave única, una invariante de negocio. */
  'CONFLICT',
  /** Alguien más lo cambió mientras se editaba. */
  'STALE_VERSION',
  /** Demasiados intentos. */
  'TOO_MANY_ATTEMPTS',
  /** Cualquier otra cosa. Siempre es un fallo, nunca algo esperado. */
  'INTERNAL',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/**
 * Datos que acompañan al error para el registro. Nunca llevan contraseñas,
 * identificadores fiscales ni nada que no se pueda escribir en un archivo de
 * registro; quien construye el error es responsable de eso.
 */
export type ErrorContext = Readonly<Record<string, string | number | boolean | null>>;

export abstract class AppError extends Error {
  abstract readonly code: ErrorCode;

  /**
   * Verdadero cuando el error es parte del funcionamiento normal y se le puede
   * enseñar a quien lo provocó. Falso cuando es un fallo que hay que investigar.
   */
  abstract readonly isOperational: boolean;

  readonly context: ErrorContext;

  constructor(
    message: string,
    options?: { readonly cause?: unknown; readonly context?: ErrorContext },
  ) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = new.target.name;
    this.context = options?.context ?? {};
  }
}

/** Base de todo lo esperado. */
abstract class OperationalError extends AppError {
  override readonly isOperational = true;
}

export class ValidationError extends OperationalError {
  override readonly code = 'VALIDATION_FAILED';

  /** Qué campo falló y por qué, para pintarlo junto a su campo. */
  readonly fieldErrors: Readonly<Record<string, string>>;

  constructor(
    fieldErrors: Readonly<Record<string, string>>,
    options?: { readonly cause?: unknown; readonly context?: ErrorContext },
  ) {
    super('El dato recibido no cumple su esquema.', options);
    this.fieldErrors = fieldErrors;
  }
}

export class AuthenticationError extends OperationalError {
  override readonly code = 'NOT_AUTHENTICATED';
}

export class AuthorizationError extends OperationalError {
  override readonly code = 'NOT_AUTHORIZED';
}

export class TwoFactorRequiredError extends OperationalError {
  override readonly code = 'TWO_FACTOR_REQUIRED';
}

export class PasswordChangeRequiredError extends OperationalError {
  override readonly code = 'PASSWORD_CHANGE_REQUIRED';
}

export class NotFoundError extends OperationalError {
  override readonly code = 'NOT_FOUND';
}

export class ConflictError extends OperationalError {
  override readonly code = 'CONFLICT';
}

export class StaleVersionError extends OperationalError {
  override readonly code = 'STALE_VERSION';
}

export class TooManyAttemptsError extends OperationalError {
  override readonly code = 'TOO_MANY_ATTEMPTS';
}

/** Lo que no se esperaba. Se registra entero y sale genérico. */
export class InternalError extends AppError {
  override readonly code = 'INTERNAL';
  override readonly isOperational = false;
}

/**
 * Convierte cualquier cosa lanzada en un error de la aplicación.
 *
 * Existe porque `catch` recibe `unknown`: una librería puede lanzar una cadena,
 * un objeto o nada. Sin este paso, el registro acabaría escribiendo "undefined"
 * y la causa se perdería.
 */
export function toAppError(thrown: unknown): AppError {
  if (thrown instanceof AppError) return thrown;

  const message = thrown instanceof Error ? thrown.message : 'Fallo no identificado.';
  return new InternalError(message, { cause: thrown });
}

/**
 * Lo que la interfaz necesita para decidir qué enseñar: el código y, si el
 * error fue de validación, qué campo falló. Nada más cruza esta frontera.
 */
export type ErrorPayload = {
  readonly code: ErrorCode;
  readonly fieldErrors?: Readonly<Record<string, string>>;
};

export function toErrorPayload(thrown: unknown): ErrorPayload {
  const error = toAppError(thrown);

  // Un fallo interno se presenta como interno y sin detalle. El detalle ya
  // quedó en el registro del servidor, que es donde sirve.
  if (!error.isOperational) return { code: 'INTERNAL' };

  if (error instanceof ValidationError) {
    return { code: error.code, fieldErrors: error.fieldErrors };
  }

  return { code: error.code };
}

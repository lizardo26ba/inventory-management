/**
 * Frontera del dominio de usuarios.
 *
 * Todo lo que llega de fuera pasa por aquí. Los parámetros de la lista vienen de
 * la dirección, que es texto escrito por cualquiera, así que se corrigen en
 * lugar de fallar: una dirección mal escrita muestra la primera página.
 *
 * Los formularios sí fallan, y con el nombre del campo. El mensaje que se lee lo
 * pone la pantalla en el idioma de quien mira; aquí solo viaja la clave.
 *
 * La contraseña no está en ningún esquema de alta. La genera el servidor y se
 * muestra una vez: pedirla en un formulario haría que el administrador eligiera
 * la contraseña de otra persona, y eso es una credencial compartida desde el
 * primer día.
 */

import { z } from 'zod';

export const USER_SORT_KEYS = [
  'name',
  'email',
  'country',
  'companies',
  'created',
  'status',
] as const;

export type UserSortKey = (typeof USER_SORT_KEYS)[number];

export const PAGE_SIZE_OPTIONS = [20, 40, 100] as const;
export const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

/** Lo más reciente primero: una cuenta recién creada es la que se viene a mirar. */
const DEFAULT_SORT_KEY: UserSortKey = 'created';
const DEFAULT_SORT_DIRECTION = 'desc';

const MAX_SEARCH_LENGTH = 100;
const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 200;

export const userListQuerySchema = z.object({
  search: z.string().trim().max(MAX_SEARCH_LENGTH).catch('').default(''),
  sort: z.enum(USER_SORT_KEYS).catch(DEFAULT_SORT_KEY).default(DEFAULT_SORT_KEY),
  direction: z
    .enum(['asc', 'desc'])
    .catch(DEFAULT_SORT_DIRECTION)
    .default(DEFAULT_SORT_DIRECTION),
  page: z.coerce.number().int().min(1).catch(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((value): value is (typeof PAGE_SIZE_OPTIONS)[number] =>
      PAGE_SIZE_OPTIONS.includes(value as (typeof PAGE_SIZE_OPTIONS)[number]),
    )
    .catch(DEFAULT_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
});

export type UserListQuery = z.infer<typeof userListQuerySchema>;

export function parseUserListQuery(
  params: Readonly<Record<string, string | string[] | undefined>>,
): UserListQuery {
  const single = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return userListQuerySchema.parse({
    search: single('q'),
    sort: single('sort'),
    direction: single('dir'),
    page: single('page'),
    pageSize: single('size'),
  });
}

/**
 * Un acceso: una empresa y el rol que se ocupa en ella.
 *
 * El rol es obligatorio. Un acceso sin rol dejaría a alguien dentro de una
 * empresa sin poder hacer nada, y nadie sabría si eso fue a propósito o un
 * descuido.
 */
export const accessSchema = z.object({
  organizationId: z.string().uuid('required'),
  roleId: z.string().uuid('required'),
});

export type AccessInput = z.infer<typeof accessSchema>;

/** Que la misma empresa no aparezca dos veces con roles distintos. */
function hasUniqueOrganizations(accesses: readonly AccessInput[]): boolean {
  return new Set(accesses.map((access) => access.organizationId)).size === accesses.length;
}

const accessesSchema = z
  .array(accessSchema)
  .max(200, 'tooMany')
  .default([])
  .refine(hasUniqueOrganizations, 'duplicatedOrganization');

const MAX_REASON_LENGTH = 300;

/**
 * Los campos del acceso de plataforma.
 *
 * Van aparte de los accesos a empresas porque no son un rol: no se conceden
 * dentro de una empresa, alcanzan a todas, y por eso no viajan en esa lista ni se
 * pueden asignar a un rol. Ver ADR 0005.
 *
 * El motivo es obligatorio al conceder. La concesión existe para poder revisarse:
 * sin motivo, dentro de seis meses nadie sabe por qué esa cuenta lo tiene.
 */
const platformAdminShape = {
  isPlatformAdmin: z.boolean().default(false),
  platformAdminReason: z.string().trim().max(MAX_REASON_LENGTH, 'tooLong').default(''),
};

function requireReasonWhenGranting(
  data: { readonly isPlatformAdmin: boolean; readonly platformAdminReason: string },
  context: z.RefinementCtx,
): void {
  if (data.isPlatformAdmin && data.platformAdminReason === '') {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['platformAdminReason'],
      message: 'required',
    });
  }
}

const userFieldsSchema = z.object({
  firstName: z.string().trim().min(1, 'required').max(MAX_NAME_LENGTH, 'tooLong'),
  lastName: z.string().trim().min(1, 'required').max(MAX_NAME_LENGTH, 'tooLong'),
  // En minúsculas porque es la credencial de acceso: quien escribe su correo con
  // una mayúscula al entrar tiene que encontrar su cuenta igual.
  email: z.string().trim().toLowerCase().max(MAX_EMAIL_LENGTH, 'tooLong').email('invalidEmail'),
  countryCode: z.string().trim().length(2, 'required').toUpperCase(),
  accesses: accessesSchema,
  ...platformAdminShape,
});

export const createUserSchema = userFieldsSchema.superRefine(requireReasonWhenGranting);

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const userIdSchema = z.object({
  id: z.string().uuid('required'),
});

export const setUserActiveSchema = userIdSchema.extend({
  isActive: z.boolean(),
});

export type SetUserActiveInput = z.infer<typeof setUserActiveSchema>;

/**
 * Edición.
 *
 * La versión viaja con el formulario: es la que tenía la cuenta al abrir la
 * pantalla, y sirve para que dos personas editando a la vez no se pisen en
 * silencio.
 */
export const updateUserSchema = userFieldsSchema
  .extend({
    id: z.string().uuid('required'),
    version: z.coerce.number().int().min(0),
  })
  .superRefine(requireReasonWhenGranting);

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/**
 * Traduce el fallo de un esquema a un mapa de campo y clave de error.
 *
 * Los accesos se reportan bajo una sola clave y no por índice: al formulario le
 * sirve saber que la lista de accesos está mal, no cuál de las doscientas filas.
 */
export function toFieldErrors(error: z.ZodError): Readonly<Record<string, string>> {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const first = issue.path[0];
    const field = typeof first === 'string' ? first : 'form';
    errors[field] ??= issue.message;
  }

  return errors;
}

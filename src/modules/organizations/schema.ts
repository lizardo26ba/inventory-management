/**
 * Frontera del dominio de empresas.
 *
 * Los parámetros de la lista llegan de la dirección, que es texto escrito por
 * cualquiera: una página negativa, un tamaño de mil filas o un campo de orden
 * inventado son peticiones perfectamente posibles. Este esquema los convierte en
 * valores con los que se puede consultar, o los sustituye por el valor de
 * partida. No falla: una dirección mal escrita muestra la primera página, no un
 * error.
 */

import { z } from 'zod';

/**
 * Por qué columna se puede ordenar. La clave viaja en la dirección.
 *
 * No está la de almacenes. El esquema guarda el identificador de organización en
 * el almacén como un escalar, sin relación de Prisma, así que la base no puede
 * ordenar por ese recuento. La columna se muestra igual, pero no es ordenable, y
 * eso es preferible a ordenar en memoria: ordenar lo que cabe en una página no
 * ordena la lista, solo lo aparenta.
 */
export const ORGANIZATION_SORT_KEYS = [
  'name',
  'slug',
  'country',
  'currency',
  'users',
  'created',
  'status',
] as const;

export type OrganizationSortKey = (typeof ORGANIZATION_SORT_KEYS)[number];

export const PAGE_SIZE_OPTIONS = [20, 40, 100] as const;
export const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

/**
 * Lo más reciente primero. Lo último que se dio de alta es lo que se viene a
 * mirar, y el orden alfabético entierra una empresa nueva en medio de la lista.
 */
const DEFAULT_SORT_KEY: OrganizationSortKey = 'created';
const DEFAULT_SORT_DIRECTION = 'desc';

/** Un texto de búsqueda más largo que esto no es una búsqueda. */
const MAX_SEARCH_LENGTH = 100;

export const organizationListQuerySchema = z.object({
  search: z.string().trim().max(MAX_SEARCH_LENGTH).catch('').default(''),
  sort: z.enum(ORGANIZATION_SORT_KEYS).catch(DEFAULT_SORT_KEY).default(DEFAULT_SORT_KEY),
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

export type OrganizationListQuery = z.infer<typeof organizationListQuerySchema>;

/**
 * Lee los parámetros tal como vienen de la dirección.
 *
 * Los nombres son cortos porque acaban a la vista en la barra del navegador y
 * se comparten por enlace.
 */
export function parseOrganizationListQuery(
  params: Readonly<Record<string, string | string[] | undefined>>,
): OrganizationListQuery {
  const single = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return organizationListQuerySchema.parse({
    search: single('q'),
    sort: single('sort'),
    direction: single('dir'),
    page: single('page'),
    pageSize: single('size'),
  });
}

/**
 * Alta de empresa.
 *
 * El código no está entre los campos a propósito: lo asigna el sistema a partir
 * del nombre comercial y no se puede escribir a mano. Ver `service.ts`.
 *
 * La zona horaria tampoco se pide. Sale del país elegido, que es lo que el
 * catálogo ya sabe, y preguntarla sería pedir dos veces el mismo dato.
 */
export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1, 'required').max(120, 'tooLong'),
  legalName: z.string().trim().min(1, 'required').max(200, 'tooLong'),
  countryCode: z.string().trim().length(2, 'required').toUpperCase(),
  baseCurrencyCode: z.string().trim().length(3, 'required').toUpperCase(),
  // El identificador fiscal es opcional: una empresa se puede registrar antes de
  // tenerlo. Cuando está, no se repite dentro del mismo país.
  taxId: z.string().trim().max(40, 'tooLong').default(''),
  email: z.union([z.literal(''), z.string().trim().email('invalidEmail')]).default(''),
  phone: z.string().trim().max(40, 'tooLong').default(''),
  address: z.string().trim().max(300, 'tooLong').default(''),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

/**
 * Cambiar el estado de una empresa, y eliminarla.
 *
 * Las dos operaciones solo necesitan a quién se le aplica, pero el
 * identificador llega del navegador como cualquier otro dato y por eso pasa por
 * el esquema igual que un formulario entero.
 */
export const organizationIdSchema = z.object({
  id: z.string().uuid('required'),
});

export const setOrganizationActiveSchema = organizationIdSchema.extend({
  isActive: z.boolean(),
});

export type SetOrganizationActiveInput = z.infer<typeof setOrganizationActiveSchema>;

/**
 * Edición de empresa.
 *
 * Faltan dos campos a propósito. El código no se edita porque encabeza el número
 * de cada documento ya emitido. La moneda base tampoco, porque es la unidad en la
 * que está valorado todo el inventario: cambiarla no convertiría los costos, los
 * reinterpretaría.
 *
 * La versión viaja con el formulario. Es la que tenía la empresa cuando se abrió
 * la pantalla, y sirve para que dos personas editando a la vez no se pisen en
 * silencio.
 */
export const updateOrganizationSchema = createOrganizationSchema
  .omit({ baseCurrencyCode: true })
  .extend({
    id: z.string().uuid('required'),
    version: z.coerce.number().int().min(0),
  });

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

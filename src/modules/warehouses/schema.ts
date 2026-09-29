/**
 * Frontera del dominio de almacenes.
 *
 * Los formularios y las acciones son estrictos: un campo que el esquema no
 * conoce se rechaza. Los parámetros de la lista, en cambio, llegan de la
 * dirección y se toleran: un valor inventado vuelve al de partida en lugar de
 * fallar.
 *
 * Los mensajes son claves de `copy.fieldErrors`, nunca frases: el texto depende
 * del idioma de quien mira. RN-013.
 */

import { z } from 'zod';

/**
 * RN-090: de 2 a 10 letras, dígitos o guiones. Corto para caber en una etiqueta
 * y sin espacios para poder escribirse con un lector de códigos. La base lo
 * defiende con la misma expresión, en la restricción `warehouses_code_format`.
 */
export const WAREHOUSE_CODE_PATTERN = /^[A-Z0-9-]{2,10}$/;
export const WAREHOUSE_CODE_MAX_LENGTH = 10;

const NAME_MAX_LENGTH = 120;
const ADDRESS_MAX_LENGTH = 300;
/** El identificador de zona más largo de la base de zonas ronda los treinta. */
const TIME_ZONE_MAX_LENGTH = 64;
const MAX_SEARCH_LENGTH = 100;

/**
 * El código se guarda en mayúsculas y sin espacios alrededor. Así "main" y
 * "MAIN " son el mismo código y chocan en la clave única, que es lo que se
 * espera de un identificador corto.
 */
const warehouseCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(1, 'required')
  .regex(WAREHOUSE_CODE_PATTERN, 'invalidWarehouseCode');

/**
 * Alta de almacén.
 *
 * La empresa no viaja: sale de la sesión. Aceptarla del navegador dejaría crear
 * almacenes en otra empresa cambiando un campo.
 *
 * La zona horaria se valida aquí solo en forma. Que pertenezca al país elegido
 * lo decide el servicio, que conoce el catálogo.
 */
export const createWarehouseSchema = z.strictObject({
  code: warehouseCodeSchema,
  name: z.string().trim().min(1, 'required').max(NAME_MAX_LENGTH, 'tooLong'),
  address: z.string().trim().max(ADDRESS_MAX_LENGTH, 'tooLong').default(''),
  countryCode: z.string().trim().length(2, 'required').toUpperCase(),
  timeZone: z.string().trim().min(1, 'required').max(TIME_ZONE_MAX_LENGTH, 'tooLong'),
});

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;

/**
 * Edición de almacén.
 *
 * Sin el código: no cambia una vez creado (RN-091). Si viajara, el esquema
 * estricto lo rechazaría en lugar de ignorarlo en silencio.
 *
 * La versión es la que tenía el almacén al abrir la pantalla, para que dos
 * personas editando a la vez no se pisen.
 */
export const updateWarehouseSchema = createWarehouseSchema.omit({ code: true }).extend({
  id: z.string().uuid('required'),
  version: z.coerce.number().int().min(0),
});

export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;

/** Archivar o reactivar. RN-093: archivar es la única forma de retirar un almacén. */
export const setWarehouseActiveSchema = z.strictObject({
  id: z.string().uuid('required'),
  isActive: z.boolean(),
});

export type SetWarehouseActiveInput = z.infer<typeof setWarehouseActiveSchema>;

/** Por qué columna se puede ordenar. La clave viaja en la dirección. */
export const WAREHOUSE_SORT_KEYS = ['name', 'code', 'country', 'timeZone', 'status'] as const;

export type WarehouseSortKey = (typeof WAREHOUSE_SORT_KEYS)[number];

/** Por nombre: aquí se busca un almacén conocido, no lo último dado de alta. */
const DEFAULT_SORT_KEY: WarehouseSortKey = 'name';
const DEFAULT_SORT_DIRECTION = 'asc';

export const warehouseListQuerySchema = z.object({
  search: z.string().trim().max(MAX_SEARCH_LENGTH).catch('').default(''),
  sort: z.enum(WAREHOUSE_SORT_KEYS).catch(DEFAULT_SORT_KEY).default(DEFAULT_SORT_KEY),
  direction: z
    .enum(['asc', 'desc'])
    .catch(DEFAULT_SORT_DIRECTION)
    .default(DEFAULT_SORT_DIRECTION),
});

export type WarehouseListQuery = z.infer<typeof warehouseListQuerySchema>;

/** Lee los parámetros tal como vienen de la dirección, con sus nombres cortos. */
export function parseWarehouseListQuery(
  params: Readonly<Record<string, string | string[] | undefined>>,
): WarehouseListQuery {
  const single = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return warehouseListQuerySchema.parse({
    search: single('q'),
    sort: single('sort'),
    direction: single('dir'),
  });
}

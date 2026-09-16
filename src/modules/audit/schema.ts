/**
 * Frontera de lectura de la bitácora.
 *
 * Los parámetros llegan de la dirección, que es texto escrito por cualquiera. Este
 * esquema los convierte en una consulta con la que se puede ir a la base, o los
 * descarta. No falla: una dirección mal escrita muestra la primera página sin
 * filtrar, nunca un error.
 *
 * Todos los filtros son de coincidencia exacta y tienen índice detrás. No hay
 * búsqueda por fragmento: recorrería la tabla que más crece del sistema. Ver
 * `.claude/agents/database-architect.md`, sección 6.
 */

import { z } from 'zod';

import { AUDIT_ACTIONS } from './types';

export const AUDIT_PAGE_SIZE_OPTIONS = [20, 40, 100] as const;
export const DEFAULT_AUDIT_PAGE_SIZE = AUDIT_PAGE_SIZE_OPTIONS[0];

/** El valor del filtro de empresa para lo que no afecta a ninguna. */
export const PLATFORM_SCOPE = 'platform';

/** Un día del calendario, no un instante. La zona la aplica quien consulta. */
const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/;

const MAX_EMAIL_LENGTH = 320;
const MAX_IDENTIFIER_LENGTH = 64;

/**
 * Un identificador que llega de la dirección. Se acota para que una cadena de un
 * megabyte no llegue a la base, y se descarta en silencio si no encaja.
 */
const identifier = z.string().trim().max(MAX_IDENTIFIER_LENGTH);

export const auditListQuerySchema = z.object({
  action: z.enum(AUDIT_ACTIONS).optional().catch(undefined),
  /** El identificador de la empresa, o `platform` para lo que no afecta a ninguna. */
  organization: identifier.optional().catch(undefined),
  actorEmail: z.string().trim().toLowerCase().max(MAX_EMAIL_LENGTH).optional().catch(undefined),
  correlationId: identifier.optional().catch(undefined),
  from: z.string().regex(CALENDAR_DAY).optional().catch(undefined),
  to: z.string().regex(CALENDAR_DAY).optional().catch(undefined),
  /** La fila frontera para ver lo anterior a ella. */
  older: identifier.optional().catch(undefined),
  /** La fila frontera para ver lo posterior a ella. */
  newer: identifier.optional().catch(undefined),
  pageSize: z.coerce
    .number()
    .int()
    // Comprueba el valor sin estrechar el tipo: lo que llega de la dirección se
    // limita al menú, pero el repositorio acepta cualquier tamaño, que es lo que
    // permite probarlo con páginas pequeñas.
    .refine((value) => AUDIT_PAGE_SIZE_OPTIONS.some((option) => option === value))
    .catch(DEFAULT_AUDIT_PAGE_SIZE)
    .default(DEFAULT_AUDIT_PAGE_SIZE),
});

export type AuditListQuery = z.infer<typeof auditListQuerySchema>;

/** El parámetro que abre el detalle. Vive en la dirección, para poder enlazarlo. */
export const AUDIT_ENTRY_PARAM = 'entry';

/**
 * Lee los parámetros tal como vienen de la dirección.
 *
 * Los nombres son cortos porque acaban a la vista en la barra del navegador y se
 * comparten por enlace. Un parámetro vacío es un parámetro que no está: así
 * limpiar un filtro deja la dirección sin él y no como cadena vacía.
 */
export function parseAuditListQuery(
  params: Readonly<Record<string, string | string[] | undefined>>,
): AuditListQuery {
  const single = (key: string): string | undefined => {
    const value = params[key];
    const first = Array.isArray(value) ? value[0] : value;
    return first === undefined || first.trim() === '' ? undefined : first;
  };

  return auditListQuerySchema.parse({
    action: single('action'),
    organization: single('company'),
    actorEmail: single('actor'),
    correlationId: single('correlation'),
    from: single('from'),
    to: single('to'),
    older: single('older'),
    newer: single('newer'),
    pageSize: single('size'),
  });
}

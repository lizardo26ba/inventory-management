import 'server-only';

/**
 * Único lugar del dominio de auditoría que habla con Prisma.
 *
 * Escribe y lee, pero nunca edita ni borra. No hay función para hacerlo porque la
 * bitácora no se edita ni se borra, y la base lo rechazaría igual. RN-071.
 *
 * Al escribir recibe la transacción en lugar de abrir la suya, y no acepta el
 * cliente suelto. La entrada tiene que escribirse dentro de la misma transacción
 * que el cambio que describe: si el cambio se revierte, la entrada también, y si
 * la entrada no se puede escribir, el cambio no ocurre. Pedir la transacción en la
 * firma es lo que impide olvidarlo.
 *
 * La lectura es de plataforma: recorre las entradas de todas las empresas. Es la
 * excepción declarada del ADR 0005, y por eso el nombre lo dice. Solo la alcanza
 * quien tiene `platform.audit:read`, que se comprueba antes, en la pantalla.
 */

import { type Prisma } from '@prisma/client';

import { withScope, type DataScope } from '@/lib/db/scope';

import { PLATFORM_SCOPE, type AuditListQuery } from './schema';
import { startOfNextUtcDay, startOfUtcDay, toAuditFields, toAuditRow } from './service';
import {
  type AuditContext,
  type AuditEntry,
  type AuditLogDetail,
  type AuditLogListItem,
  type AuditLogPage,
} from './types';

export async function recordAuditEntries(
  tx: Prisma.TransactionClient,
  context: AuditContext,
  entries: readonly AuditEntry[],
): Promise<void> {
  if (entries.length === 0) return;

  await tx.auditLog.createMany({
    data: entries.map((entry) => {
      const row = toAuditRow(context, entry);
      // Una columna JSON anulable no acepta null en Prisma: se omite y queda nula.
      return { ...row, before: row.before ?? undefined, after: row.after ?? undefined };
    }),
  });
}

const LIST_SELECT = {
  id: true,
  createdAt: true,
  action: true,
  entityType: true,
  entityLabel: true,
  organizationId: true,
  actingAsPlatformAdmin: true,
  correlationId: true,
  organization: { select: { name: true } },
  actor: { select: { firstName: true, lastName: true, email: true } },
} satisfies Prisma.AuditLogSelect;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  entityId: true,
  permissionCode: true,
  before: true,
  after: true,
  ipAddress: true,
  userAgent: true,
} satisfies Prisma.AuditLogSelect;

type ListRow = Prisma.AuditLogGetPayload<{ select: typeof LIST_SELECT }>;
type DetailRow = Prisma.AuditLogGetPayload<{ select: typeof DETAIL_SELECT }>;

function toListItem(row: ListRow): AuditLogListItem {
  return {
    id: row.id,
    createdAt: row.createdAt,
    action: row.action,
    entityType: row.entityType,
    entityLabel: row.entityLabel,
    organizationId: row.organizationId,
    organizationName: row.organization?.name ?? null,
    actor:
      row.actor === null
        ? null
        : { name: `${row.actor.firstName} ${row.actor.lastName}`, email: row.actor.email },
    actingAsPlatformAdmin: row.actingAsPlatformAdmin,
    correlationId: row.correlationId,
  };
}

function toDetail(row: DetailRow): AuditLogDetail {
  return {
    ...toListItem(row),
    entityId: row.entityId,
    permissionCode: row.permissionCode,
    before: toAuditFields(row.before),
    after: toAuditFields(row.after),
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
  };
}

/**
 * Lo que pide la pantalla, traducido a condiciones.
 *
 * Todo es igualdad o rango sobre columnas indexadas. El correo del autor viaja
 * como texto pero filtra por la relación, así que la base resuelve el usuario por
 * su índice único y luego busca por su identificador.
 */
function filtersFor(query: AuditListQuery): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};

  if (query.action !== undefined) where.action = query.action;
  if (query.organization === PLATFORM_SCOPE) where.organizationId = null;
  else if (query.organization !== undefined) where.organizationId = query.organization;
  if (query.actorEmail !== undefined) where.actor = { email: query.actorEmail };
  if (query.correlationId !== undefined) where.correlationId = query.correlationId;

  if (query.from !== undefined || query.to !== undefined) {
    where.createdAt = {
      ...(query.from === undefined ? {} : { gte: startOfUtcDay(query.from) }),
      ...(query.to === undefined ? {} : { lt: startOfNextUtcDay(query.to) }),
    };
  }

  return where;
}

/** La fila frontera. Un cursor que ya no existe se trata como si no viniera. */
type Boundary = { readonly id: string; readonly createdAt: Date };

async function findBoundary(
  tx: Prisma.TransactionClient,
  id: string | undefined,
): Promise<Boundary | null> {
  if (id === undefined) return null;

  return tx.auditLog.findUnique({ where: { id }, select: { id: true, createdAt: true } });
}

/**
 * Lo anterior o lo posterior a una fila, sin saltarse las que comparten instante.
 *
 * Varias entradas de una misma operación se escriben a la vez y tienen el mismo
 * instante. Comparar solo por fecha dejaría fuera unas cuantas o las mostraría dos
 * veces; el identificador desempata, igual que en el orden.
 */
function beyond(boundary: Boundary, direction: 'older' | 'newer'): Prisma.AuditLogWhereInput {
  const compare = direction === 'older' ? 'lt' : 'gt';

  return {
    OR: [
      { createdAt: { [compare]: boundary.createdAt } },
      { createdAt: boundary.createdAt, id: { [compare]: boundary.id } },
    ],
  };
}

/**
 * Una página de la bitácora de toda la plataforma.
 *
 * Pagina por cursor sobre `(created_at, id)`: no hay total ni número de página,
 * porque contar o saltar recorrería la tabla entera, y esta es la que más crece.
 * Se piden `pageSize + 1` filas, y esa de más es la que dice si hay más adelante
 * sin necesidad de contar nada.
 *
 * Al retroceder hacia lo más reciente, la base ordena al revés y el resultado se
 * da la vuelta aquí, de modo que la pantalla siempre recibe lo más reciente
 * primero.
 */
export async function listPlatformAuditEntries(
  scope: DataScope,
  query: AuditListQuery,
): Promise<AuditLogPage> {
  const filters = filtersFor(query);
  const goingBack = query.newer !== undefined;

  return withScope(scope, async (tx) => {
    const boundary = await findBoundary(tx, goingBack ? query.newer : query.older);

    const where =
      boundary === null
        ? filters
        : { AND: [filters, beyond(boundary, goingBack ? 'newer' : 'older')] };

    const direction: Prisma.SortOrder = goingBack && boundary !== null ? 'asc' : 'desc';
    const rows = await tx.auditLog.findMany({
      where,
      select: LIST_SELECT,
      orderBy: [{ createdAt: direction }, { id: direction }],
      take: query.pageSize + 1,
    });

    const hasMore = rows.length > query.pageSize;
    const page = rows.slice(0, query.pageSize);
    const items = (direction === 'asc' ? [...page].reverse() : page).map(toListItem);

    const first = items[0];
    const last = items[items.length - 1];

    // Hacia lo más reciente, lo de más dice si todavía queda algo por encima, y
    // siempre queda algo por debajo: la página de la que se vino.
    const hasNewer = direction === 'asc' ? hasMore : boundary !== null;
    const hasOlder = direction === 'asc' ? true : hasMore;

    return {
      items,
      newerCursor: hasNewer && first !== undefined ? first.id : null,
      olderCursor: hasOlder && last !== undefined ? last.id : null,
    };
  });
}

/** Una entrada concreta, con el antes y el después. */
export async function findPlatformAuditEntry(
  scope: DataScope,
  id: string,
): Promise<AuditLogDetail | null> {
  const row = await withScope(scope, (tx) =>
    tx.auditLog.findUnique({ where: { id }, select: DETAIL_SELECT }),
  );

  return row === null ? null : toDetail(row);
}

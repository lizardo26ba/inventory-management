import 'server-only';

/**
 * Único lugar del dominio de almacenes que habla con Prisma.
 *
 * Tres decisiones que conviene leer antes de tocar una consulta:
 *
 * 1. Todo corre con el alcance de empresa, y además cada consulta filtra por la
 *    empresa de ese alcance. La seguridad a nivel de fila ya lo impone (ADR
 *    0010); el filtro explícito es la primera barrera y hace que el índice por
 *    empresa se use. Si una de las dos falla, la otra sigue en pie.
 * 2. Un almacén no se borra (RN-093), pero la fecha de borrado existe: la pone el
 *    borrado de su empresa. Un almacén con esa fecha no existe para nadie, y el
 *    filtro va en todas las consultas de este archivo.
 * 3. La lista no pagina. Una empresa tiene unos pocos almacenes y la lista no
 *    crece con el uso, como sí crecen los movimientos. Si algún día una empresa
 *    tuviera cientos, se pagina por cursor, no por desplazamiento.
 */

import type { Prisma } from '@prisma/client';

import { withScope, type DataScope } from '@/lib/db/scope';
import { AuthorizationError } from '@/lib/errors';
import { diffFields, recordAuditEntries, type AuditContext } from '@/modules/audit';

import type { WarehouseListQuery, WarehouseSortKey } from './schema';
import type { WarehouseCountryOption, WarehouseDetail, WarehouseListItem } from './types';

const NOT_DELETED = { deletedAt: null } satisfies Prisma.WarehouseWhereInput;

/**
 * La empresa del alcance. Este dominio solo existe dentro de una empresa, así
 * que un alcance sin ella es un error de programación: la puerta de la pantalla
 * o de la acción tenía que haberlo impedido antes.
 */
function organizationOf(scope: DataScope): string {
  if (scope.organizationId === null) {
    throw new AuthorizationError('Los almacenes solo se consultan dentro de una empresa.');
  }
  return scope.organizationId;
}

function orderBy(
  sort: WarehouseSortKey,
  direction: Prisma.SortOrder,
): Prisma.WarehouseOrderByWithRelationInput {
  switch (sort) {
    case 'name':
      return { name: direction };
    case 'code':
      return { code: direction };
    case 'country':
      return { country: { name: direction } };
    // Por el identificador de la zona. Todos empiezan por su continente, así que
    // dentro de uno el orden es el de la ciudad que se enseña.
    case 'timeZone':
      return { timeZone: direction };
    case 'status':
      return { isActive: direction };
  }
}

/** Por nombre y por código, sin distinguir mayúsculas: nadie recuerda cómo se escribió. */
function searchFilter(search: string): Prisma.WarehouseWhereInput {
  if (search === '') return {};

  return {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
    ],
  };
}

const ITEM_SELECT = {
  id: true,
  code: true,
  name: true,
  address: true,
  countryCode: true,
  timeZone: true,
  isActive: true,
  country: { select: { name: true } },
} satisfies Prisma.WarehouseSelect;

type ItemRow = Prisma.WarehouseGetPayload<{ select: typeof ITEM_SELECT }>;

function toListItem(row: ItemRow): WarehouseListItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    address: row.address,
    countryCode: row.countryCode,
    countryName: row.country.name,
    timeZone: row.timeZone,
    isActive: row.isActive,
  };
}

export async function listWarehouses(
  scope: DataScope,
  query: WarehouseListQuery,
): Promise<{ readonly items: readonly WarehouseListItem[]; readonly total: number }> {
  const organizationId = organizationOf(scope);

  return withScope(scope, async (tx) => {
    // El total es de la empresa entera, no de la búsqueda: con él la pantalla
    // distingue "no hay almacenes" de "ninguno coincide".
    const [rows, total] = await Promise.all([
      tx.warehouse.findMany({
        where: { organizationId, ...NOT_DELETED, ...searchFilter(query.search) },
        select: ITEM_SELECT,
        orderBy: [orderBy(query.sort, query.direction), { id: 'asc' }],
      }),
      tx.warehouse.count({ where: { organizationId, ...NOT_DELETED } }),
    ]);

    return { items: rows.map(toListItem), total };
  });
}

/** La ficha de un almacén por su código, dentro de la empresa del alcance. */
export async function findWarehouseByCode(
  scope: DataScope,
  code: string,
): Promise<WarehouseDetail | null> {
  const organizationId = organizationOf(scope);

  return withScope(scope, async (tx) => {
    const row = await tx.warehouse.findFirst({
      where: { organizationId, code, ...NOT_DELETED },
      select: { ...ITEM_SELECT, version: true },
    });

    return row === null ? null : { ...toListItem(row), version: row.version };
  });
}

/**
 * Los países que se pueden elegir, con sus zonas.
 *
 * El catálogo guarda hoy una zona por país, la de omisión, y por eso la lista de
 * zonas tiene un elemento. Cuando el catálogo declare varias, cambia esta
 * consulta y nada más.
 */
export async function listWarehouseCountryOptions(
  scope: DataScope,
): Promise<WarehouseCountryOption[]> {
  const rows = await withScope(scope, (tx) =>
    tx.country.findMany({
      where: { isActive: true },
      select: { code: true, name: true, phonePrefix: true, defaultTimeZone: true },
      orderBy: { name: 'asc' },
    }),
  );

  return rows.map((row) => ({
    code: row.code,
    name: row.name,
    phonePrefix: row.phonePrefix,
    timeZones: [row.defaultTimeZone],
  }));
}

export type WarehouseData = {
  readonly name: string;
  readonly address: string | null;
  readonly countryCode: string;
  readonly timeZone: string;
};

/**
 * Crea un almacén y su entrada en la bitácora, juntos.
 *
 * Un código repetido lo rechaza la clave única de la base, no una consulta
 * previa: entre preguntar y escribir cabe otra alta. Quien llama traduce ese
 * rechazo.
 */
export async function createWarehouse(
  scope: DataScope,
  actorId: string,
  data: WarehouseData & { readonly code: string },
  audit: AuditContext,
): Promise<{ readonly id: string }> {
  const organizationId = organizationOf(scope);

  return withScope(scope, async (tx) => {
    const created = await tx.warehouse.create({
      // Al nacer, quien lo creó es también quien lo tocó por última vez.
      data: { ...data, organizationId, createdById: actorId, updatedById: actorId },
      select: { id: true },
    });

    await recordAuditEntries(tx, audit, [
      {
        action: 'warehouse.created',
        entityType: 'Warehouse',
        entityId: created.id,
        entityLabel: data.name,
        organizationId,
        after: data,
      },
    ]);

    return created;
  });
}

export type UpdateWarehouseResult =
  | { readonly outcome: 'UPDATED' }
  | { readonly outcome: 'NOT_FOUND' }
  | { readonly outcome: 'STALE_VERSION' };

/**
 * Guarda los cambios de un almacén, solo si nadie lo tocó mientras tanto.
 *
 * La condición de la versión va en el mismo `WHERE` que la escritura: entre leer
 * y escribir cabe el guardado de otra persona. La lectura de antes no decide si
 * se escribe; distingue por qué no se pudo y dice qué cambió, para la bitácora.
 *
 * El código no entra: no cambia una vez creado (RN-091).
 */
export async function updateWarehouse(
  scope: DataScope,
  id: string,
  version: number,
  actorId: string,
  data: WarehouseData,
  audit: AuditContext,
): Promise<UpdateWarehouseResult> {
  const organizationId = organizationOf(scope);

  return withScope(scope, async (tx) => {
    const current = await tx.warehouse.findFirst({
      where: { id, organizationId, ...NOT_DELETED },
      select: { name: true, address: true, countryCode: true, timeZone: true },
    });

    if (current === null) return { outcome: 'NOT_FOUND' };

    const result = await tx.warehouse.updateMany({
      where: { id, organizationId, version, ...NOT_DELETED },
      data: { ...data, updatedById: actorId, version: { increment: 1 } },
    });

    if (result.count === 0) return { outcome: 'STALE_VERSION' };

    const changes = diffFields(current, data);

    // Guardar sin tocar nada sube la versión, pero no es un cambio que contar.
    if (changes !== null) {
      await recordAuditEntries(tx, audit, [
        {
          action: 'warehouse.updated',
          entityType: 'Warehouse',
          entityId: id,
          entityLabel: data.name,
          organizationId,
          ...changes,
        },
      ]);
    }

    return { outcome: 'UPDATED' };
  });
}

export type SetWarehouseActiveResult = 'UPDATED' | 'NOT_FOUND' | 'HAS_STOCK';

/**
 * Archiva o reactiva un almacén. RN-093: archivar es la única forma de retirarlo.
 *
 * RN-092 no deja archivar un almacén con existencias. La regla cruza dos tablas,
 * así que no cabe en una restricción, y un disparador sería lógica de negocio en
 * la base, que las reglas prohíben. Se defiende aquí, y sin rendija:
 *
 * - Se bloquea la fila del almacén antes de leer sus saldos. Otro archivado
 *   simultáneo espera a que este termine.
 * - Toda operación que mueva existencias tiene que bloquear la misma fila en modo
 *   compartido y comprobar que el almacén sigue activo antes de escribir. Así un
 *   movimiento y un archivado sobre el mismo almacén no pueden cruzarse: uno
 *   espera al otro, y el segundo ve lo que dejó el primero. Ese es el contrato que
 *   el módulo de existencias tiene que cumplir.
 *
 * Pedir el estado que ya tenía no es un error, pero tampoco un cambio, así que
 * no deja entrada en la bitácora.
 */
export async function setWarehouseActive(
  scope: DataScope,
  id: string,
  isActive: boolean,
  actorId: string,
  audit: AuditContext,
): Promise<SetWarehouseActiveResult> {
  const organizationId = organizationOf(scope);

  return withScope(scope, async (tx) => {
    // Bloqueo pesimista sobre una sola fila, que es lo único que las reglas
    // admiten. Prisma no expresa FOR UPDATE, así que va en SQL con parámetros.
    const locked = await tx.$queryRaw<readonly { readonly id: string }[]>`
      SELECT id FROM warehouses
      WHERE id = ${id} AND organization_id = ${organizationId} AND deleted_at IS NULL
      FOR UPDATE
    `;

    if (locked.length === 0) return 'NOT_FOUND';

    const current = await tx.warehouse.findFirstOrThrow({
      where: { id, organizationId },
      select: { name: true, isActive: true },
    });

    if (current.isActive === isActive) return 'UPDATED';

    if (!isActive) {
      const stocked = await tx.stockLevel.findFirst({
        where: { organizationId, warehouseId: id, quantity: { not: 0 } },
        select: { id: true },
      });
      if (stocked !== null) return 'HAS_STOCK';
    }

    await tx.warehouse.update({
      where: { id },
      data: { isActive, updatedById: actorId },
    });

    await recordAuditEntries(tx, audit, [
      {
        action: isActive ? 'warehouse.activated' : 'warehouse.archived',
        entityType: 'Warehouse',
        entityId: id,
        entityLabel: current.name,
        organizationId,
        before: { isActive: current.isActive },
        after: { isActive },
      },
    ]);

    return 'UPDATED';
  });
}

import 'server-only';

/**
 * Único lugar del dominio de empresas que habla con Prisma.
 *
 * Tres decisiones que conviene leer antes de tocar una consulta:
 *
 * 1. Filtrar, ordenar y recortar ocurre en la base, no en memoria. Traer la
 *    tabla entera para quedarse con veinte filas funciona con veintidós
 *    empresas y deja de funcionar mucho antes de lo que parece.
 * 2. Los recuentos de usuarios y de almacenes se cuentan, no se guardan. Un
 *    contador en la fila sería más rápido de leer y se desincroniza el día que
 *    alguien inserte una membresía por otro camino.
 * 3. Toda consulta corre dentro del ayudante de alcance, que abre la transacción
 *    y le dice a la base en qué empresa se actúa. Sin él no hay contexto y las
 *    políticas devuelven cero filas. ADR 0010.
 *
 * Una empresa borrada no existe para nadie: el filtro por fecha de borrado va en
 * todas las consultas de este archivo, sin excepción.
 */

import { type Prisma } from '@prisma/client';

import { withScope, type DataScope } from '@/lib/db/scope';
import { createSystemRoles } from '@/lib/db/system-roles';
import { diffFields, recordAuditEntries, type AuditContext } from '@/modules/audit';

import {
  type OrganizationDetail,
  type OrganizationListItem,
  type OrganizationPage,
  type OrganizationsSummary,
} from './types';
import { type OrganizationListQuery, type OrganizationSortKey } from './schema';

/** Lo vivo. Se repite en cada consulta a propósito, para que no se olvide. */
const NOT_DELETED = { deletedAt: null } satisfies Prisma.OrganizationWhereInput;

/**
 * Cómo se traduce cada clave de orden a la cláusula de Prisma.
 *
 * Ordenar por número de usuarios ordena por el recuento de la relación, que es
 * lo que la persona ve en la columna.
 */
function orderBy(
  sort: OrganizationSortKey,
  direction: Prisma.SortOrder,
): Prisma.OrganizationOrderByWithRelationInput {
  switch (sort) {
    case 'name':
      return { name: direction };
    case 'slug':
      return { slug: direction };
    case 'country':
      return { country: { name: direction } };
    case 'currency':
      return { baseCurrencyCode: direction };
    case 'users':
      return { memberships: { _count: direction } };
    case 'status':
      return { isActive: direction };
    case 'created':
      return { createdAt: direction };
  }
}

/**
 * El filtro de búsqueda.
 *
 * Busca por nombre comercial, razón social y código, que son los tres textos por
 * los que alguien reconoce una empresa. Sin distinguir mayúsculas, porque nadie
 * recuerda cómo estaba escrita.
 */
function searchFilter(search: string): Prisma.OrganizationWhereInput {
  if (search === '') return {};

  return {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { legalName: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ],
  };
}

const LIST_SELECT = {
  id: true,
  slug: true,
  name: true,
  legalName: true,
  countryCode: true,
  baseCurrencyCode: true,
  taxId: true,
  isActive: true,
  createdAt: true,
  country: { select: { name: true } },
  _count: { select: { memberships: true } },
} satisfies Prisma.OrganizationSelect;

type ListRow = Prisma.OrganizationGetPayload<{ select: typeof LIST_SELECT }>;

function toListItem(row: ListRow, warehouseCount: number): OrganizationListItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    legalName: row.legalName,
    countryCode: row.countryCode,
    countryName: row.country.name,
    baseCurrencyCode: row.baseCurrencyCode,
    taxId: row.taxId,
    isActive: row.isActive,
    createdAt: row.createdAt,
    userCount: row._count.memberships,
    warehouseCount,
  };
}

/**
 * Cuántos almacenes tiene cada una de las empresas de esta página.
 *
 * Va en una consulta aparte porque el almacén guarda el identificador de
 * organización como escalar y Prisma no puede contarlo desde la organización.
 * Se agrupa solo por los identificadores de la página, que son cien como mucho,
 * así que es una consulta acotada y no una por fila.
 */
async function countWarehousesByOrganization(
  tx: Prisma.TransactionClient,
  organizationIds: readonly string[],
): Promise<ReadonlyMap<string, number>> {
  if (organizationIds.length === 0) return new Map();

  const groups = await tx.warehouse.groupBy({
    by: ['organizationId'],
    where: { organizationId: { in: [...organizationIds] }, deletedAt: null },
    _count: { _all: true },
  });

  return new Map(groups.map((group) => [group.organizationId, group._count._all]));
}

export async function listOrganizations(
  scope: DataScope,
  query: OrganizationListQuery,
): Promise<OrganizationPage> {
  const where: Prisma.OrganizationWhereInput = {
    ...NOT_DELETED,
    ...searchFilter(query.search),
  };

  return withScope(scope, async (tx) => {
    // El recuento y la página van en la misma transacción: si se pidieran por
    // separado, una alta entre las dos consultas daría un total que no cuadra
    // con las filas mostradas.
    const [rows, total] = await Promise.all([
      tx.organization.findMany({
        where,
        select: LIST_SELECT,
        orderBy: [
          orderBy(query.sort, query.direction),
          // Desempate estable. Sin él, dos empresas con la misma fecha pueden
          // cambiar de sitio entre páginas y una fila se vería dos veces.
          { id: 'asc' },
        ],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      tx.organization.count({ where }),
    ]);

    const warehouseCounts = await countWarehousesByOrganization(
      tx,
      rows.map((row) => row.id),
    );

    return {
      items: rows.map((row) => toListItem(row, warehouseCounts.get(row.id) ?? 0)),
      total,
    };
  });
}

/**
 * Las cifras de cabecera, de la plataforma entera.
 *
 * No las afecta la búsqueda: responden a cuánto hay, no a cuánto coincide.
 */
export async function summarizeOrganizations(scope: DataScope): Promise<OrganizationsSummary> {
  return withScope(scope, async (tx) => {
    const [organizationCount, userCount, warehouseCount, countries] = await Promise.all([
      tx.organization.count({ where: NOT_DELETED }),
      tx.membership.count({ where: { revokedAt: null, organization: NOT_DELETED } }),
      // Los almacenes de una empresa borrada se borran con ella: la operación de
      // borrado lo garantiza, y por eso aquí basta con mirar el almacén.
      tx.warehouse.count({ where: { deletedAt: null } }),
      tx.organization.findMany({
        where: NOT_DELETED,
        select: { countryCode: true },
        distinct: ['countryCode'],
      }),
    ]);

    return { organizationCount, userCount, warehouseCount, countryCount: countries.length };
  });
}

/** Los países y monedas que se pueden elegir. Vienen del catálogo, no del código. */
export type CountryOption = {
  readonly code: string;
  readonly name: string;
  readonly defaultCurrencyCode: string;
  readonly defaultTimeZone: string;
  readonly taxIdLabel: string;
  readonly taxIdPattern: string | null;
  readonly phonePrefix: string;
  /** Plantilla de separación del número. Vacía cuando el país no la declara. */
  readonly phoneMask: string;
  readonly phoneExample: string;
};

export async function listCountryOptions(scope: DataScope): Promise<CountryOption[]> {
  return withScope(scope, (tx) =>
    tx.country.findMany({
      where: { isActive: true },
      select: {
        code: true,
        name: true,
        defaultCurrencyCode: true,
        defaultTimeZone: true,
        taxIdLabel: true,
        taxIdPattern: true,
        phonePrefix: true,
        phoneMask: true,
        phoneExample: true,
      },
      orderBy: { name: 'asc' },
    }),
  );
}

export type CurrencyOption = {
  readonly code: string;
  readonly name: string;
};

export async function listCurrencyOptions(scope: DataScope): Promise<CurrencyOption[]> {
  return withScope(scope, (tx) =>
    tx.currency.findMany({
      where: { isActive: true },
      select: { code: true, name: true },
      orderBy: { code: 'asc' },
    }),
  );
}

/**
 * Los códigos ya tomados, para que el que se genere no choque.
 *
 * Incluye los de las empresas borradas: su código sigue impreso en documentos
 * que existen, así que reutilizarlo mezclaría la numeración de dos empresas
 * distintas.
 */
export async function listTakenSlugs(scope: DataScope): Promise<string[]> {
  const rows = await withScope(scope, (tx) =>
    tx.organization.findMany({ select: { slug: true } }),
  );

  return rows.map((row) => row.slug);
}

export async function createOrganization(
  scope: DataScope,
  data: {
    /** Quien la está creando. Solo el super administrador, por RN-003. */
    readonly actorId: string;
    readonly slug: string;
    readonly name: string;
    readonly legalName: string;
    readonly countryCode: string;
    readonly baseCurrencyCode: string;
    readonly timeZone: string;
    readonly taxId: string | null;
    readonly email: string | null;
    readonly phone: string | null;
    readonly address: string | null;
  },
  audit: AuditContext,
): Promise<{ readonly id: string; readonly slug: string }> {
  // La empresa, sus roles y su entrada en la bitácora nacen juntos. Una empresa
  // sin roles no puede recibir a nadie: conceder un acceso exige elegir con qué
  // alcance, y sin roles no hay alcance que elegir. Si algo falla a mitad, no
  // queda ni la empresa.
  const { actorId, ...fields } = data;

  return withScope(scope, async (tx) => {
    const created = await tx.organization.create({
      // Al nacer, quien la creó es también quien la tocó por última vez.
      data: { ...fields, createdById: actorId, updatedById: actorId },
      select: { id: true, slug: true },
    });

    await createSystemRoles(tx, created.id);

    await recordAuditEntries(tx, audit, [
      {
        action: 'organization.created',
        entityType: 'Organization',
        entityId: created.id,
        entityLabel: fields.name,
        organizationId: created.id,
        after: fields,
      },
    ]);

    return created;
  });
}

/**
 * Enciende o apaga una empresa.
 *
 * Devuelve si la empresa existe. Cero filas afectadas significa que no existe o
 * que ya estaba borrada, y eso no es un cambio silencioso: quien llama lo
 * convierte en un error. Pedir el estado que ya tenía no es un error, pero
 * tampoco un cambio, así que no deja entrada.
 */
export async function setOrganizationActive(
  scope: DataScope,
  id: string,
  isActive: boolean,
  actorId: string,
  audit: AuditContext,
): Promise<boolean> {
  return withScope(scope, async (tx) => {
    const current = await tx.organization.findFirst({
      where: { id, ...NOT_DELETED },
      select: { name: true, isActive: true },
    });

    if (current === null) return false;

    const result = await tx.organization.updateMany({
      where: { id, ...NOT_DELETED },
      data: { isActive, updatedById: actorId },
    });

    if (result.count === 0) return false;

    if (current.isActive !== isActive) {
      await recordAuditEntries(tx, audit, [
        {
          action: isActive ? 'organization.activated' : 'organization.deactivated',
          entityType: 'Organization',
          entityId: id,
          entityLabel: current.name,
          organizationId: id,
          before: { isActive: current.isActive },
          after: { isActive },
        },
      ]);
    }

    return true;
  });
}

/**
 * Borra una empresa sin borrarla.
 *
 * Se marca la fecha de borrado en lugar de quitar la fila. Una empresa aparece
 * en movimientos de existencias, documentos y bitácora, y arrancarla de la base
 * dejaría esa historia apuntando al vacío. Para todas las consultas de este
 * archivo, una empresa con fecha de borrado no existe.
 *
 * Sus almacenes caen con ella y en la misma transacción. Dejarlos vivos haría
 * que el recuento de almacenes de la plataforma contara los de una empresa que
 * ya nadie ve.
 */
export async function softDeleteOrganization(
  scope: DataScope,
  id: string,
  actorId: string,
  audit: AuditContext,
): Promise<boolean> {
  // Un solo instante para todas las escrituras. Dos llamadas al reloj darían dos
  // valores, y el dato diría que los almacenes se borraron después que su
  // empresa. Ver docs/standards/dates-and-times.md
  const deletedAt = new Date();

  return withScope(scope, async (tx) => {
    const current = await tx.organization.findFirst({
      where: { id, ...NOT_DELETED },
      select: { name: true, isActive: true },
    });

    if (current === null) return false;

    const result = await tx.organization.updateMany({
      where: { id, ...NOT_DELETED },
      data: { deletedAt, isActive: false, updatedById: actorId },
    });

    if (result.count === 0) return false;

    await tx.warehouse.updateMany({
      where: { organizationId: id, deletedAt: null },
      data: { deletedAt, updatedById: actorId },
    });

    // Una sola entrada. Los almacenes caen como consecuencia del borrado, no por
    // decisión propia, y comparten el identificador de correlación.
    await recordAuditEntries(tx, audit, [
      {
        action: 'organization.deleted',
        entityType: 'Organization',
        entityId: id,
        entityLabel: current.name,
        organizationId: id,
        before: { isActive: current.isActive, deletedAt: null },
        after: { isActive: false, deletedAt: deletedAt.toISOString() },
      },
    ]);

    return true;
  });
}

/**
 * La ficha de una empresa, por su código.
 *
 * Se busca por el código y no por el identificador porque es lo que viaja en la
 * dirección: es corto, se reconoce y se puede leer en voz alta. El identificador
 * interno no aparece en ninguna ruta.
 */
export async function findOrganizationBySlug(
  scope: DataScope,
  slug: string,
): Promise<OrganizationDetail | null> {
  return withScope(scope, async (tx) => {
    const row = await tx.organization.findFirst({
      where: { slug, ...NOT_DELETED },
      select: {
        id: true,
        slug: true,
        name: true,
        legalName: true,
        countryCode: true,
        baseCurrencyCode: true,
        taxId: true,
        email: true,
        phone: true,
        address: true,
        timeZone: true,
        isActive: true,
        createdAt: true,
        version: true,
        country: { select: { name: true } },
        _count: { select: { memberships: true } },
      },
    });

    if (row === null) return null;

    const warehouseCount = await tx.warehouse.count({
      where: { organizationId: row.id, deletedAt: null },
    });

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      legalName: row.legalName,
      countryCode: row.countryCode,
      countryName: row.country.name,
      baseCurrencyCode: row.baseCurrencyCode,
      taxId: row.taxId,
      email: row.email,
      phone: row.phone,
      address: row.address,
      timeZone: row.timeZone,
      isActive: row.isActive,
      createdAt: row.createdAt,
      userCount: row._count.memberships,
      warehouseCount,
      version: row.version,
    };
  });
}

/**
 * Lo que devuelve un intento de guardar. Distingue por qué no se pudo, y en el
 * caso bueno entrega el código, que es la dirección de la ficha que hay que
 * refrescar.
 */
export type UpdateResult =
  | { readonly outcome: 'UPDATED'; readonly slug: string }
  | { readonly outcome: 'NOT_FOUND' }
  | { readonly outcome: 'STALE_VERSION' };

/**
 * Guarda los cambios de una empresa, solo si nadie la tocó mientras tanto.
 *
 * La condición de la versión va dentro del mismo `WHERE` que la escritura, no en
 * una consulta previa: entre leer y escribir cabe el guardado de otra persona, y
 * comprobarlo aparte volvería a abrir esa rendija. La lectura de antes no decide
 * si se escribe: distingue por qué no se pudo y dice qué cambió, que es lo que va
 * a la bitácora.
 *
 * Ni el código ni la moneda base entran aquí. El código encabeza el número de
 * cada documento y la moneda es la unidad en la que está valorado todo el
 * inventario: cambiarlos reescribiría la historia.
 */
export async function updateOrganization(
  scope: DataScope,
  id: string,
  version: number,
  actorId: string,
  data: {
    readonly name: string;
    readonly legalName: string;
    readonly countryCode: string;
    readonly taxId: string | null;
    readonly email: string | null;
    readonly phone: string | null;
    readonly address: string | null;
  },
  audit: AuditContext,
): Promise<UpdateResult> {
  return withScope(scope, async (tx) => {
    const current = await tx.organization.findFirst({
      where: { id, ...NOT_DELETED },
      select: {
        slug: true,
        name: true,
        legalName: true,
        countryCode: true,
        taxId: true,
        email: true,
        phone: true,
        address: true,
      },
    });

    if (current === null) return { outcome: 'NOT_FOUND' };

    const result = await tx.organization.updateMany({
      where: { id, version, ...NOT_DELETED },
      data: { ...data, updatedById: actorId, version: { increment: 1 } },
    });

    if (result.count === 0) return { outcome: 'STALE_VERSION' };

    const { slug, ...before } = current;
    const changes = diffFields(before, data);

    // Guardar sin tocar nada sube la versión, pero no es un cambio que contar.
    if (changes !== null) {
      await recordAuditEntries(tx, audit, [
        {
          action: 'organization.updated',
          entityType: 'Organization',
          entityId: id,
          entityLabel: data.name,
          organizationId: id,
          ...changes,
        },
      ]);
    }

    return { outcome: 'UPDATED', slug };
  });
}

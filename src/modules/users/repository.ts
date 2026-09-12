import 'server-only';

/**
 * Único lugar del dominio de usuarios que habla con Prisma.
 *
 * Tres decisiones que conviene leer antes de tocar una consulta:
 *
 * 1. Filtrar, ordenar y recortar ocurre en la base. Traer la tabla entera para
 *    quedarse con veinte filas deja de funcionar mucho antes de lo que parece.
 * 2. Una cuenta borrada no existe para nadie: el filtro por fecha de borrado va
 *    en todas las consultas de este archivo, sin excepción.
 * 3. Los accesos se revocan, no se borran. Una membresía cuenta la historia de
 *    quién pudo entrar a qué y desde cuándo, y arrancar la fila la perdería. Para
 *    todas las lecturas de aquí, una membresía revocada no existe.
 *
 * Nada de lo que sale por aquí incluye la huella de la contraseña ni el secreto
 * del segundo factor. No se dibujan, así que no se leen.
 */

import { type Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/client';

import {
  type OrganizationChoice,
  type UserDetail,
  type UserListItem,
  type UserPage,
  type UsersSummary,
} from './types';
import { type UserListQuery, type UserSortKey } from './schema';
import { diffAccesses } from './service';

/** Lo vivo. Se repite en cada consulta a propósito, para que no se olvide. */
const NOT_DELETED = { deletedAt: null } satisfies Prisma.UserWhereInput;

/** Una membresía viva: concedida y no revocada. */
const ACTIVE_MEMBERSHIP = {
  revokedAt: null,
  isActive: true,
  organization: { deletedAt: null },
} satisfies Prisma.MembershipWhereInput;

function orderBy(
  sort: UserSortKey,
  direction: Prisma.SortOrder,
): Prisma.UserOrderByWithRelationInput[] {
  switch (sort) {
    // Por apellido primero, que es como se busca a una persona en una lista.
    case 'name':
      return [{ lastName: direction }, { firstName: direction }];
    case 'email':
      return [{ email: direction }];
    case 'country':
      return [{ countryCode: direction }];
    case 'companies':
      return [{ memberships: { _count: direction } }];
    case 'status':
      return [{ status: direction }];
    case 'created':
      return [{ createdAt: direction }];
  }
}

/**
 * El filtro de búsqueda.
 *
 * Nombre, apellido y correo, que son las tres formas de reconocer a una persona.
 * Sin distinguir mayúsculas, porque nadie recuerda cómo estaba escrito.
 */
function searchFilter(search: string): Prisma.UserWhereInput {
  if (search === '') return {};

  return {
    OR: [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ],
  };
}

const LIST_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  countryCode: true,
  status: true,
  createdAt: true,
  country: { select: { name: true } },
  platformAdmin: { select: { revokedAt: true } },
  memberships: {
    where: ACTIVE_MEMBERSHIP,
    select: {
      organizationId: true,
      organization: { select: { name: true, slug: true, countryCode: true } },
      roles: {
        select: { role: { select: { id: true, code: true, name: true } } },
      },
    },
    orderBy: { organization: { name: 'asc' } },
  },
} satisfies Prisma.UserSelect;

type ListRow = Prisma.UserGetPayload<{ select: typeof LIST_SELECT }>;

function toListItem(row: ListRow): UserListItem {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    countryCode: row.countryCode,
    countryName: row.country?.name ?? null,
    status: row.status,
    // Una concesión revocada no cuenta. La fila se conserva porque es el rastro
    // de que alguien tuvo ese poder.
    isPlatformAdmin: row.platformAdmin !== null && row.platformAdmin.revokedAt === null,
    createdAt: row.createdAt,
    accesses: row.memberships.flatMap((membership) =>
      // El esquema permite varios roles por membresía. Hoy la interfaz concede
      // uno, así que lo normal es una fila; si hubiera más, se muestran todas en
      // lugar de esconder lo que la base dice.
      membership.roles.map((assignment) => ({
        organizationId: membership.organizationId,
        organizationName: membership.organization.name,
        organizationSlug: membership.organization.slug,
        countryCode: membership.organization.countryCode,
        roleId: assignment.role.id,
        roleCode: assignment.role.code,
        roleName: assignment.role.name,
      })),
    ),
  };
}

export async function listUsers(query: UserListQuery): Promise<UserPage> {
  const where: Prisma.UserWhereInput = {
    ...NOT_DELETED,
    ...searchFilter(query.search),
  };

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: LIST_SELECT,
      orderBy: [
        ...orderBy(query.sort, query.direction),
        // Desempate estable. Sin él, dos cuentas con la misma fecha pueden
        // cambiar de sitio entre páginas y una fila se vería dos veces.
        { id: 'asc' },
      ],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return { items: rows.map(toListItem), total };
}

/**
 * Las cifras de cabecera, de la plataforma entera.
 *
 * No las afecta la búsqueda: responden a cuánto hay, no a cuánto coincide.
 */
export async function summarizeUsers(): Promise<UsersSummary> {
  const [userCount, activeCount, organizations, administratorMemberships] = await Promise.all([
    prisma.user.count({ where: NOT_DELETED }),
    prisma.user.count({ where: { ...NOT_DELETED, status: 'ACTIVE' } }),
    prisma.membership.findMany({
      where: { ...ACTIVE_MEMBERSHIP, user: NOT_DELETED },
      select: { organizationId: true },
      distinct: ['organizationId'],
    }),
    // Administrador es el rol del sistema con ese código. Se cuentan personas,
    // no membresías: quien administra tres empresas es una sola persona.
    prisma.membership.findMany({
      where: {
        ...ACTIVE_MEMBERSHIP,
        user: NOT_DELETED,
        roles: { some: { role: { code: 'admin' } } },
      },
      select: { userId: true },
      distinct: ['userId'],
    }),
  ]);

  return {
    userCount,
    activeCount,
    organizationsReached: organizations.length,
    administratorCount: administratorMemberships.length,
  };
}

const DETAIL_SELECT = {
  ...LIST_SELECT,
  // El motivo solo hace falta en la ficha, para poder editarlo. En la lista
  // ocuparía sitio sin que nadie lo lea.
  platformAdmin: { select: { revokedAt: true, reason: true } },
  version: true,
  mustChangePassword: true,
  lastLoginAt: true,
} satisfies Prisma.UserSelect;

export async function findUserById(id: string): Promise<UserDetail | null> {
  const row = await prisma.user.findFirst({
    where: { id, ...NOT_DELETED },
    select: DETAIL_SELECT,
  });

  if (row === null) return null;

  return {
    ...toListItem(row),
    version: row.version,
    platformAdminReason:
      row.platformAdmin !== null && row.platformAdmin.revokedAt === null
        ? row.platformAdmin.reason
        : null,
    mustChangePassword: row.mustChangePassword,
    lastLoginAt: row.lastLoginAt,
  };
}

/**
 * Las empresas que se pueden conceder, con los roles de cada una.
 *
 * Los roles son de cada empresa, así que viajan dentro de ella: ofrecer una
 * lista única de roles llevaría a conceder en una empresa un rol de otra.
 *
 * Las empresas suspendidas aparecen igual. Suspender una empresa no cancela la
 * lista de quién la alcanza, y esconderla haría desaparecer accesos ya
 * concedidos de la pantalla que sirve para revisarlos.
 */
export async function listOrganizationChoices(): Promise<OrganizationChoice[]> {
  const rows = await prisma.organization.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      countryCode: true,
      roles: {
        select: { id: true, code: true, name: true },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    countryCode: row.countryCode,
    roles: row.roles,
  }));
}

export type EmailAvailability = 'FREE' | 'TAKEN';

/**
 * Si un correo se puede usar.
 *
 * Mira también las cuentas borradas. El correo es la credencial de acceso y es
 * único en la tabla entera: reutilizar el de una cuenta borrada dejaría la
 * historia de dos personas distintas bajo el mismo nombre.
 */
export async function checkEmail(
  email: string,
  exceptUserId?: string,
): Promise<EmailAvailability> {
  const existing = await prisma.user.findFirst({
    where: { email, ...(exceptUserId === undefined ? {} : { id: { not: exceptUserId } }) },
    select: { id: true },
  });

  return existing === null ? 'FREE' : 'TAKEN';
}

export type CreateUserData = {
  readonly email: string;
  readonly passwordHash: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly countryCode: string;
  readonly accesses: readonly { readonly organizationId: string; readonly roleId: string }[];
  /** Presente solo cuando además se concede el acceso de plataforma. */
  readonly platformAdmin?: {
    readonly reason: string;
    readonly grantedById: string;
  };
};

/**
 * Concede el acceso de plataforma, o revive una concesión revocada.
 *
 * Nunca borra la fila. Una concesión revocada es el rastro de que alguien tuvo
 * ese poder y de quién se lo quitó, y eso es justo lo que se mira cuando algo
 * sale mal. Volver a conceder limpia la revocación y deja el motivo nuevo.
 */
async function grantPlatformAdmin(
  tx: Prisma.TransactionClient,
  userId: string,
  reason: string,
  grantedById: string,
): Promise<void> {
  await tx.platformAdmin.upsert({
    where: { userId },
    update: { reason, grantedById, grantedAt: new Date(), revokedAt: null, revokedById: null },
    create: { userId, reason, grantedById },
  });
}

/** Retira el acceso de plataforma dejando constancia de quién lo retiró. */
async function revokePlatformAdmin(
  tx: Prisma.TransactionClient,
  userId: string,
  revokedById: string,
): Promise<void> {
  await tx.platformAdmin.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date(), revokedById },
  });
}

/**
 * Crea la cuenta y sus accesos de una vez.
 *
 * Todo en una transacción: una cuenta a medio conceder dejaría a alguien dentro
 * de una empresa y fuera de otra sin que nadie lo pidiera.
 *
 * Nace obligada a cambiar la contraseña. La inicial la conoce quien creó la
 * cuenta, así que mientras siga puesta no es de su dueño.
 */
export async function createUser(data: CreateUserData): Promise<{ readonly id: string }> {
  return prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        countryCode: data.countryCode,
        status: 'ACTIVE',
        mustChangePassword: true,
      },
      select: { id: true },
    });

    for (const access of data.accesses) {
      const membership = await tx.membership.create({
        data: { userId: created.id, organizationId: access.organizationId },
        select: { id: true },
      });

      await tx.membershipRole.create({
        data: { membershipId: membership.id, roleId: access.roleId },
      });
    }

    if (data.platformAdmin !== undefined) {
      await grantPlatformAdmin(
        tx,
        created.id,
        data.platformAdmin.reason,
        data.platformAdmin.grantedById,
      );
    }

    return created;
  });
}

export type UpdateResult =
  | { readonly outcome: 'UPDATED' }
  | { readonly outcome: 'NOT_FOUND' }
  | { readonly outcome: 'STALE_VERSION' };

export type UpdateUserData = {
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly countryCode: string;
  readonly accesses: readonly { readonly organizationId: string; readonly roleId: string }[];
  /**
   * Cómo debe quedar el acceso de plataforma, y quién lo está decidiendo. La
   * acción ya comprobó que esa persona puede conceder o revocar.
   */
  readonly platformAdmin: {
    readonly isGranted: boolean;
    readonly reason: string;
    readonly actorId: string;
  };
};

/**
 * Guarda los datos y deja los accesos como se pidieron.
 *
 * La versión se comprueba dentro del mismo WHERE que la escritura, así que dos
 * personas guardando a la vez no se pisan: la segunda se encuentra con que su
 * versión ya no es la actual y se le dice, en lugar de perder su trabajo en
 * silencio.
 *
 * Los accesos se ajustan por diferencia. Conceder crea la membresía o revive una
 * revocada, cambiar de rol sustituye la asignación, y quitar revoca sin borrar.
 */
export async function updateUser(
  id: string,
  version: number,
  data: UpdateUserData,
): Promise<UpdateResult> {
  return prisma.$transaction(async (tx) => {
    const current = await tx.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, version: true },
    });

    if (current === null) return { outcome: 'NOT_FOUND' };

    const written = await tx.user.updateMany({
      where: { id, deletedAt: null, version },
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        countryCode: data.countryCode,
        version: { increment: 1 },
      },
    });

    if (written.count === 0) return { outcome: 'STALE_VERSION' };

    // El acceso de plataforma va dentro de la misma transacción que el resto.
    // Conceder y que luego falle el ajuste de accesos dejaría a alguien con
    // alcance a todas las empresas por un error a medio camino.
    if (data.platformAdmin.isGranted) {
      await grantPlatformAdmin(tx, id, data.platformAdmin.reason, data.platformAdmin.actorId);
    } else {
      await revokePlatformAdmin(tx, id, data.platformAdmin.actorId);
    }

    const memberships = await tx.membership.findMany({
      where: { userId: id },
      select: { id: true, organizationId: true, roles: { select: { roleId: true } } },
    });
    const byOrganization = new Map(
      memberships.map((membership) => [membership.organizationId, membership]),
    );

    // Qué cambia lo decide el servicio, que es donde está probado. Aquí solo se
    // escribe lo que diga.
    const changes = diffAccesses(
      memberships.flatMap((membership) =>
        membership.roles.map((assignment) => ({
          organizationId: membership.organizationId,
          roleId: assignment.roleId,
        })),
      ),
      data.accesses,
    );

    for (const access of changes.granted) {
      const existing = byOrganization.get(access.organizationId);

      if (existing === undefined) {
        const created = await tx.membership.create({
          data: { userId: id, organizationId: access.organizationId },
          select: { id: true },
        });
        await tx.membershipRole.create({
          data: { membershipId: created.id, roleId: access.roleId },
        });
        continue;
      }

      // Revivir una membresía revocada conserva desde cuándo existió el acceso.
      await tx.membership.update({
        where: { id: existing.id },
        data: { revokedAt: null, isActive: true },
      });
      await tx.membershipRole.create({
        data: { membershipId: existing.id, roleId: access.roleId },
      });
    }

    for (const access of changes.roleChanged) {
      const existing = byOrganization.get(access.organizationId);
      if (existing === undefined) continue;

      // El rol se sustituye en lugar de acumularse: la pantalla concede uno.
      await tx.membershipRole.deleteMany({
        where: { membershipId: existing.id, roleId: { not: access.roleId } },
      });
      await tx.membershipRole.upsert({
        where: { membershipId_roleId: { membershipId: existing.id, roleId: access.roleId } },
        update: {},
        create: { membershipId: existing.id, roleId: access.roleId },
      });
      await tx.membership.update({
        where: { id: existing.id },
        data: { revokedAt: null, isActive: true },
      });
    }

    const revokedOrganizations = new Set(changes.revokedOrganizationIds);
    const revoked = memberships.filter((membership) =>
      revokedOrganizations.has(membership.organizationId),
    );

    if (revoked.length > 0) {
      // Un solo instante para todas las revocaciones de esta operación.
      // Ver docs/standards/dates-and-times.md
      const revokedAt = new Date();

      await tx.membership.updateMany({
        where: { id: { in: revoked.map((membership) => membership.id) } },
        data: { revokedAt, isActive: false },
      });
    }

    return { outcome: 'UPDATED' };
  });
}

/**
 * Suspende o reactiva una cuenta.
 *
 * Suspender no borra las sesiones abiertas: la lectura de sesión ya rechaza una
 * cuenta suspendida en cada petición, así que el efecto es inmediato sin tocar
 * nada más. Reactivar devuelve la cuenta a activa, no a invitada: ya entró
 * alguna vez.
 */
export async function setUserActive(id: string, isActive: boolean): Promise<boolean> {
  const result = await prisma.user.updateMany({
    where: { id, deletedAt: null },
    data: { status: isActive ? 'ACTIVE' : 'SUSPENDED' },
  });

  return result.count > 0;
}

/**
 * Borra una cuenta sin borrarla.
 *
 * La fila se queda porque aparece en movimientos, documentos y bitácora, y
 * arrancarla dejaría esa historia apuntando al vacío. Sus accesos se revocan en
 * la misma transacción: una membresía viva de una cuenta borrada seguiría
 * contando en las cifras de la plataforma.
 */
export async function softDeleteUser(id: string): Promise<boolean> {
  const deletedAt = new Date();

  return prisma.$transaction(async (tx) => {
    const result = await tx.user.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt, status: 'SUSPENDED' },
    });

    if (result.count === 0) return false;

    await tx.membership.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: deletedAt, isActive: false },
    });

    // Las sesiones sí se borran. Una sesión de una cuenta que ya no existe no
    // tiene a quién representar.
    await tx.session.deleteMany({ where: { userId: id } });

    return true;
  });
}

/**
 * Los países que se pueden elegir para una persona.
 *
 * La consulta es de este dominio y no se pide prestada a empresas: cada módulo
 * lee lo que necesita, con el recorte que necesita. Aquí no hacen falta la
 * plantilla del teléfono ni el formato fiscal.
 */
export async function listCountryChoices(): Promise<
  { readonly code: string; readonly name: string; readonly phonePrefix: string }[]
> {
  return prisma.country.findMany({
    where: { isActive: true },
    select: { code: true, name: true, phonePrefix: true },
    orderBy: { name: 'asc' },
  });
}

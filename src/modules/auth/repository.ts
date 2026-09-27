import 'server-only';

/**
 * Único lugar del dominio de autenticación que habla con Prisma.
 *
 * Devuelve datos, no decide nada. Si aquí aparece un `if` sobre una regla de
 * negocio, está en el archivo equivocado: eso vive en `service.ts`.
 *
 * Las consultas piden columnas por su nombre y nunca traen el registro entero.
 * La huella de la contraseña y el secreto del segundo factor solo salen de aquí
 * cuando hacen falta, y no se cuelan en un objeto que después viaja a la
 * pantalla.
 *
 * Lo que queda en la bitácora se escribe en la misma transacción que el cambio.
 *
 * Aquí se entra sin sesión, así que lo que escribe va con el alcance anónimo: no
 * hay empresa que declarar y no se enciende ninguna excepción. Las cuentas y las
 * sesiones son tablas de identidad, que el ADR 0010 deja fuera de la seguridad a
 * nivel de fila, y por eso sus consultas no abren transacción: hacerlo triplicaría
 * los viajes a la base en cada petición sin proteger nada.
 */

import { isPermissionCode, type PermissionCode } from '@/lib/auth/permissions';
import { prisma } from '@/lib/db/client';
import { ANONYMOUS_SCOPE, personalScope, withScope, type DataScope } from '@/lib/db/scope';
import { AuthenticationError } from '@/lib/errors';
import { recordAuditEntries, type AuditContext } from '@/modules/audit';

export type SignInCandidate = {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly passwordHash: string;
  readonly status: 'INVITED' | 'ACTIVE' | 'SUSPENDED';
  readonly locale: string;
  readonly mustChangePassword: boolean;
  readonly failedLoginAttempts: number;
  readonly lockedUntil: Date | null;
  readonly twoFactorEnabledAt: Date | null;
  readonly isPlatformAdmin: boolean;
};

export async function findSignInCandidate(email: string): Promise<SignInCandidate | null> {
  const user = await prisma.user.findFirst({
    // Una cuenta borrada no entra, y se busca por correo exacto porque la
    // normalización a minúsculas ya ocurrió en el esquema de la frontera.
    where: { email, deletedAt: null },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      passwordHash: true,
      status: true,
      locale: true,
      mustChangePassword: true,
      failedLoginAttempts: true,
      lockedUntil: true,
      twoFactorEnabledAt: true,
      platformAdmin: { select: { revokedAt: true } },
    },
  });

  if (user === null) return null;

  const { platformAdmin, ...rest } = user;

  return {
    ...rest,
    // Una concesión revocada no cuenta. La fila se conserva porque es el rastro
    // de que alguien tuvo ese poder y de quién se lo quitó.
    isPlatformAdmin: platformAdmin !== null && platformAdmin.revokedAt === null,
  };
}

/**
 * Anota un intento fallido.
 *
 * Solo el intento que bloquea la cuenta va a la bitácora. Los demás se quedan en
 * el contador de la fila y en el registro: a nadie se le puede atribuir un
 * intento fallido, y escribirlos todos llenaría la tabla con el ruido de
 * cualquiera que pruebe contraseñas.
 */
export async function registerFailedAttempt(
  user: { readonly id: string; readonly email: string },
  state: { readonly failedLoginAttempts: number; readonly lockedUntil: Date | null },
  audit: AuditContext,
): Promise<void> {
  await withScope(ANONYMOUS_SCOPE, async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: state,
    });

    if (state.lockedUntil === null) return;

    await recordAuditEntries(tx, audit, [
      {
        action: 'auth.locked_out',
        entityType: 'User',
        entityId: user.id,
        entityLabel: user.email,
        organizationId: null,
        after: {
          failedLoginAttempts: state.failedLoginAttempts,
          lockedUntil: state.lockedUntil.toISOString(),
        },
      },
    ]);
  });
}

/**
 * Abre la sesión de quien acaba de entrar.
 *
 * La sesión, la puesta a cero de los intentos y la entrada de la bitácora van
 * juntas: una sesión abierta sin constancia de que alguien entró es justo lo que
 * la auditoría existe para impedir.
 */
export async function openSession(
  input: {
    readonly userId: string;
    readonly email: string;
    readonly tokenHash: string;
    readonly expiresAt: Date;
    readonly signedInAt: Date;
    readonly ipAddress: string | null;
    readonly userAgent: string | null;
  },
  audit: AuditContext,
): Promise<void> {
  await withScope(ANONYMOUS_SCOPE, async (tx) => {
    await tx.session.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        organizationId: null,
      },
    });

    await tx.user.update({
      where: { id: input.userId },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: input.signedInAt },
    });

    await recordAuditEntries(tx, audit, [
      {
        action: 'auth.signed_in',
        entityType: 'User',
        entityId: input.userId,
        entityLabel: input.email,
        organizationId: null,
      },
    ]);
  });
}

export type ActiveSession = {
  readonly id: string;
  readonly tokenHash: string;
  readonly userId: string;
  readonly organizationId: string | null;
  readonly actingAsPlatformAdmin: boolean;
  readonly twoFactorVerifiedAt: Date | null;
  readonly expiresAt: Date;
  readonly user: {
    readonly email: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly locale: string;
    readonly status: 'INVITED' | 'ACTIVE' | 'SUSPENDED';
    readonly mustChangePassword: boolean;
    readonly isPlatformAdmin: boolean;
  };
};

export async function findSessionByHash(tokenHash: string): Promise<ActiveSession | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      tokenHash: true,
      userId: true,
      organizationId: true,
      actingAsPlatformAdmin: true,
      twoFactorVerifiedAt: true,
      expiresAt: true,
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          locale: true,
          status: true,
          mustChangePassword: true,
          deletedAt: true,
          platformAdmin: { select: { revokedAt: true } },
        },
      },
    },
  });

  if (session === null) return null;

  const { user, ...rest } = session;

  // Una cuenta borrada deja sin valor a sus sesiones en el acto. Esta es la
  // revocación inmediata que el ADR 0007 pedía y que un token firmado no daba.
  if (user.deletedAt !== null) return null;

  return {
    ...rest,
    user: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      locale: user.locale,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      isPlatformAdmin: user.platformAdmin !== null && user.platformAdmin.revokedAt === null,
    },
  };
}

export async function deleteSession(tokenHash: string): Promise<void> {
  // No falla si ya no está: cerrar una sesión que caducó sola es normal.
  await prisma.session.deleteMany({ where: { tokenHash } });
}

/** Todas las sesiones de una persona. Se usa al cambiar la contraseña. */
export async function deleteSessionsOfUser(
  userId: string,
  options?: { readonly exceptTokenHash?: string },
): Promise<void> {
  await prisma.session.deleteMany({
    where: {
      userId,
      ...(options?.exceptTokenHash === undefined
        ? {}
        : { tokenHash: { not: options.exceptTokenHash } }),
    },
  });
}

export async function findPasswordHash(userId: string): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { passwordHash: true },
  });

  return user?.passwordHash ?? null;
}

/**
 * Guarda la contraseña nueva.
 *
 * La entrada de la bitácora dice que la contraseña cambió y nada más. Ni la
 * huella vieja ni la nueva: el servicio de auditoría rechaza cualquier campo que
 * se llame así.
 */
export async function updatePassword(
  user: { readonly id: string; readonly email: string },
  passwordHash: string,
  audit: AuditContext,
): Promise<void> {
  await withScope(ANONYMOUS_SCOPE, async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
        // Entrar con una contraseña temporal deja la cuenta en INVITED. Cambiarla
        // es lo que la convierte en activa.
        status: 'ACTIVE',
      },
    });

    await recordAuditEntries(tx, audit, [
      {
        action: 'auth.password_changed',
        entityType: 'User',
        entityId: user.id,
        entityLabel: user.email,
        organizationId: null,
      },
    ]);
  });
}

// ---------------------------------------------------------------------------
// La empresa activa. ADR 0013.
//
// Cada consulta filtra por la persona, la membresía viva y la empresa viva, aunque
// las políticas ya lo hagan. Son dos barreras, no una: las pruebas de integración
// corren con el rol dueño, que se salta las políticas, y lo que comprueban es este
// filtro.
// ---------------------------------------------------------------------------

/** Lo que tiene que cumplir una membresía para dar acceso. RN-006. */
const LIVE_MEMBERSHIP = {
  isActive: true,
  revokedAt: null,
  organization: { isActive: true, deletedAt: null },
} as const;

/** El alcance de una empresa, para leer lo que la persona tiene en ella. */
function companyScope(organizationId: string): DataScope {
  return { organizationId, userId: null, actingAsPlatformAdmin: false };
}

/** El alcance de plataforma. Solo se usa después de autorizar al super administrador. */
const PLATFORM_DATA_SCOPE: DataScope = {
  organizationId: null,
  userId: null,
  actingAsPlatformAdmin: true,
};

export type CompanyChoice = {
  readonly organizationId: string;
  readonly name: string;
  readonly countryCode: string;
  readonly countryName: string;
  readonly baseCurrencyCode: string;
  /** Los roles de la persona en esa empresa. Un rol propio de la empresa no tiene código. */
  readonly roles: readonly { readonly code: string | null; readonly name: string }[];
};

/** Las empresas donde la persona puede entrar como miembro, por nombre. RN-001. */
export async function listCompanyChoices(userId: string): Promise<CompanyChoice[]> {
  const rows = await withScope(personalScope(userId), (tx) =>
    tx.membership.findMany({
      where: { userId, ...LIVE_MEMBERSHIP },
      orderBy: { organization: { name: 'asc' } },
      select: {
        organization: {
          select: {
            id: true,
            name: true,
            countryCode: true,
            baseCurrencyCode: true,
            country: { select: { name: true } },
          },
        },
        roles: { select: { role: { select: { code: true, name: true } } } },
      },
    }),
  );

  return rows.map(({ organization, roles }) => ({
    organizationId: organization.id,
    name: organization.name,
    countryCode: organization.countryCode,
    countryName: organization.country.name,
    baseCurrencyCode: organization.baseCurrencyCode,
    roles: roles.map(({ role }) => role),
  }));
}

/**
 * La empresa de una membresía viva de la persona, o nada.
 *
 * Es la comprobación de RN-006: se hace al entrar y en cada petición con empresa
 * activa, para que retirar el acceso surta efecto en el acto.
 */
export async function findLiveMembershipCompany(
  userId: string,
  organizationId: string,
): Promise<{ readonly id: string; readonly name: string } | null> {
  const membership = await withScope(personalScope(userId), (tx) =>
    tx.membership.findFirst({
      where: { userId, organizationId, ...LIVE_MEMBERSHIP },
      select: { organization: { select: { id: true, name: true } } },
    }),
  );

  return membership?.organization ?? null;
}

/** Los permisos que la persona tiene en una empresa por sus roles en ella. */
export async function listCompanyPermissions(
  userId: string,
  organizationId: string,
): Promise<PermissionCode[]> {
  const rows = await withScope(companyScope(organizationId), (tx) =>
    tx.permission.findMany({
      where: {
        scope: 'ORGANIZATION',
        roles: {
          some: {
            role: {
              organizationId,
              memberships: {
                some: { membership: { userId, organizationId, ...LIVE_MEMBERSHIP } },
              },
            },
          },
        },
      },
      select: { code: true },
    }),
  );

  // Un código que el catálogo del código ya no declara no concede nada: la
  // semilla lo borra, pero hasta que vuelva a correr podría quedar en la base.
  return rows.map((row) => row.code).filter(isPermissionCode);
}

/**
 * La empresa a la que va a entrar un super administrador, si existe.
 *
 * Una empresa desactivada se puede visitar, porque diagnosticarla es una de las
 * razones para entrar. Una borrada, no.
 */
export async function findEnterableOrganization(
  organizationId: string,
): Promise<{ readonly id: string; readonly name: string } | null> {
  return withScope(PLATFORM_DATA_SCOPE, (tx) =>
    tx.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
      select: { id: true, name: true },
    }),
  );
}

/**
 * Cambia la empresa de la sesión, rotando su testigo. ADR 0007.
 *
 * La sesión nueva hereda de la vieja la caducidad absoluta, el segundo factor
 * superado y la huella de red: cambiar de empresa no alarga la vida de la sesión
 * ni borra lo que ya se comprobó. La vieja se borra en la misma transacción, así
 * que no hay un instante con dos testigos válidos.
 *
 * La entrada de la bitácora es de la empresa afectada: la que se deja o en la que
 * se entra. Por eso la transacción declara esa empresa, que es lo que la política
 * de la bitácora exige para escribirla, y con ella lee su nombre para la entrada.
 */
async function switchSessionCompany(
  input: {
    readonly currentTokenHash: string;
    readonly nextTokenHash: string;
    readonly nextOrganizationId: string | null;
    readonly actingAsPlatformAdmin: boolean;
    readonly affectedOrganizationId: string;
    readonly action: 'auth.company_entered' | 'auth.company_left';
  },
  audit: AuditContext,
): Promise<void> {
  await withScope(companyScope(input.affectedOrganizationId), async (tx) => {
    const current = await tx.session.findUnique({
      where: { tokenHash: input.currentTokenHash },
      select: {
        userId: true,
        organizationId: true,
        twoFactorVerifiedAt: true,
        expiresAt: true,
        ipAddress: true,
        userAgent: true,
      },
    });

    if (current === null) throw new AuthenticationError('La sesión ya no existe.');

    await tx.session.create({
      data: {
        tokenHash: input.nextTokenHash,
        userId: current.userId,
        organizationId: input.nextOrganizationId,
        actingAsPlatformAdmin: input.actingAsPlatformAdmin,
        twoFactorVerifiedAt: current.twoFactorVerifiedAt,
        expiresAt: current.expiresAt,
        ipAddress: current.ipAddress,
        userAgent: current.userAgent,
      },
    });
    await tx.session.delete({ where: { tokenHash: input.currentTokenHash } });

    const affected = await tx.organization.findUnique({
      where: { id: input.affectedOrganizationId },
      select: { name: true },
    });

    await recordAuditEntries(tx, audit, [
      {
        action: input.action,
        entityType: 'Organization',
        entityId: input.affectedOrganizationId,
        entityLabel: affected?.name ?? null,
        organizationId: input.affectedOrganizationId,
        before: { organizationId: current.organizationId },
        after: { organizationId: input.nextOrganizationId },
      },
    ]);
  });
}

export async function enterCompanySession(
  input: {
    readonly currentTokenHash: string;
    readonly nextTokenHash: string;
    readonly organizationId: string;
    readonly actingAsPlatformAdmin: boolean;
  },
  audit: AuditContext,
): Promise<void> {
  await switchSessionCompany(
    {
      currentTokenHash: input.currentTokenHash,
      nextTokenHash: input.nextTokenHash,
      nextOrganizationId: input.organizationId,
      actingAsPlatformAdmin: input.actingAsPlatformAdmin,
      affectedOrganizationId: input.organizationId,
      action: 'auth.company_entered',
    },
    audit,
  );
}

export async function leaveCompanySession(
  input: {
    readonly currentTokenHash: string;
    readonly nextTokenHash: string;
    readonly organizationId: string;
  },
  audit: AuditContext,
): Promise<void> {
  await switchSessionCompany(
    {
      currentTokenHash: input.currentTokenHash,
      nextTokenHash: input.nextTokenHash,
      nextOrganizationId: null,
      actingAsPlatformAdmin: false,
      affectedOrganizationId: input.organizationId,
      action: 'auth.company_left',
    },
    audit,
  );
}

export type CompanySummary = {
  readonly name: string;
  readonly countryCode: string;
  readonly baseCurrencyCode: string;
};

/**
 * Lo que el marco enseña de la empresa activa. Se lee con el alcance de esa
 * empresa, así que solo la alcanza quien ya pasó la puerta de la empresa.
 */
export async function findCompanySummary(
  organizationId: string,
): Promise<CompanySummary | null> {
  return withScope(companyScope(organizationId), (tx) =>
    tx.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
      select: { name: true, countryCode: true, baseCurrencyCode: true },
    }),
  );
}

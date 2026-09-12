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
 */

import { prisma } from '@/lib/db/client';

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

export async function registerFailedAttempt(
  userId: string,
  state: { readonly failedLoginAttempts: number; readonly lockedUntil: Date | null },
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: state,
  });
}

export async function registerSuccessfulSignIn(userId: string, at: Date): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: at },
  });
}

export async function createSession(input: {
  readonly userId: string;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}): Promise<void> {
  await prisma.session.create({ data: { ...input, organizationId: null } });
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

export async function updatePassword(userId: string, passwordHash: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      mustChangePassword: false,
      // Entrar con una contraseña temporal deja la cuenta en INVITED. Cambiarla
      // es lo que la convierte en activa.
      status: 'ACTIVE',
    },
  });
}

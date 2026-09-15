'use server';

/**
 * Server Actions del dominio de usuarios.
 *
 * Delgadas: autorizan, validan, delegan y traducen el resultado. El orden no es
 * casual. Primero el permiso, porque quien no puede crear cuentas tampoco debe
 * enterarse de si un correo ya existe; después el esquema, porque la lógica no
 * debe ver un dato sin validar.
 *
 * El alta es la única que no redirige. Devuelve la contraseña temporal para que
 * la pantalla la muestre una vez, y por eso no puede irse a otro sitio antes de
 * que alguien la haya leído. No se escribe en el registro, ni en la bitácora, ni
 * viaja en la dirección: se dice una vez y se olvida.
 *
 * El contexto de auditoría se construye justo antes de escribir, con el permiso
 * que autorizó la operación. Viaja al repositorio, que escribe las entradas en
 * la misma transacción que el cambio.
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { type PermissionCode } from '@/lib/auth/permissions';
import { ConflictError, NotFoundError, toErrorPayload, type ErrorPayload } from '@/lib/errors';
import { logger } from '@/lib/observability/logger';
import { buildAuditContext } from '@/modules/audit';
import { hashPassword, requirePlatformPermission } from '@/modules/auth';

import {
  checkEmail,
  createUser as insertUser,
  findUserById as findUser,
  listOrganizationChoices,
  setUserActive as updateUserActive,
  softDeleteUser as removeUser,
  updateUser as saveUser,
} from './repository';
import { USERS_PATH } from './routes';
import {
  createUserSchema,
  setUserActiveSchema,
  toFieldErrors,
  updateUserSchema,
  userIdSchema,
  type AccessInput,
} from './schema';
import { generateTemporaryPassword } from './service';

export type UserActionResult =
  { readonly ok: true } | { readonly ok: false; readonly error: ErrorPayload };

export type CreateUserResult =
  | { readonly ok: true; readonly email: string; readonly temporaryPassword: string }
  | { readonly ok: false; readonly error: ErrorPayload };

/**
 * Que cada rol concedido pertenezca a la empresa donde se concede.
 *
 * El formulario ya lo garantiza, porque ofrece los roles de cada empresa. Se
 * comprueba igual: la acción se puede invocar sin pasar por el formulario, y un
 * rol de otra empresa concedería permisos que nadie revisó.
 */
async function checkAccesses(
  accesses: readonly AccessInput[],
): Promise<{ readonly ok: true } | { readonly ok: false; readonly error: ErrorPayload }> {
  if (accesses.length === 0) return { ok: true };

  const organizations = await listOrganizationChoices();
  const rolesByOrganization = new Map(
    organizations.map((organization) => [
      organization.id,
      new Set(organization.roles.map((role) => role.id)),
    ]),
  );

  for (const access of accesses) {
    const roles = rolesByOrganization.get(access.organizationId);

    if (roles === undefined) {
      return {
        ok: false,
        error: { code: 'VALIDATION_FAILED', fieldErrors: { accesses: 'unknownOrganization' } },
      };
    }

    if (!roles.has(access.roleId)) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          fieldErrors: { accesses: 'roleNotInOrganization' },
        },
      };
    }
  }

  return { ok: true };
}

export async function createUser(input: unknown): Promise<CreateUserResult> {
  const permission: PermissionCode = 'platform.user:create';

  try {
    const session = await requirePlatformPermission(permission);

    const parsed = createUserSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: { code: 'VALIDATION_FAILED', fieldErrors: toFieldErrors(parsed.error) },
      };
    }

    // Conceder el acceso de plataforma es una capacidad aparte de crear cuentas.
    // Quien puede dar de alta gente no tiene por qué poder repartir el privilegio
    // que alcanza a todas las empresas. ADR 0005.
    if (parsed.data.isPlatformAdmin) {
      await requirePlatformPermission('platform.admin:grant');
    }

    const checked = await checkAccesses(parsed.data.accesses);
    if (!checked.ok) return { ok: false, error: checked.error };

    // El correo se comprueba antes por cortesía, para poder señalar el campo. La
    // garantía real es la restricción única de la base, que no tiene rendija
    // entre la consulta y la escritura y se traduce más abajo.
    if ((await checkEmail(parsed.data.email)) === 'TAKEN') {
      return { ok: false, error: { code: 'CONFLICT', fieldErrors: { email: 'emailTaken' } } };
    }

    const temporaryPassword = generateTemporaryPassword();

    await insertUser(
      {
        actorId: session.userId,
        email: parsed.data.email,
        passwordHash: await hashPassword(temporaryPassword),
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        countryCode: parsed.data.countryCode,
        accesses: parsed.data.accesses,
        platformAdmin: parsed.data.isPlatformAdmin
          ? { reason: parsed.data.platformAdminReason, grantedById: session.userId }
          : undefined,
      },
      await buildAuditContext(session, permission),
    );

    // La lista está en caché de ruta: sin esto, la cuenta recién creada no
    // aparecería hasta que algo más la invalidara.
    revalidatePath(USERS_PATH);

    return { ok: true, email: parsed.data.email, temporaryPassword };
  } catch (error) {
    if (isUniqueViolation(error)) {
      logger.failure('users.create', new ConflictError('Correo repetido.'));
      return { ok: false, error: { code: 'CONFLICT', fieldErrors: { email: 'emailTaken' } } };
    }

    logger.failure('users.create', error);
    return { ok: false, error: toErrorPayload(error) };
  }
}

/**
 * El choque de correo lo detecta la base, no una consulta previa.
 *
 * Preguntar antes y escribir después deja una rendija: entre las dos cosas cabe
 * otra alta. La restricción única no la tiene, así que se intenta escribir y se
 * traduce su rechazo.
 */
const UNIQUE_VIOLATION = 'P2002';

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { readonly code?: unknown }).code === UNIQUE_VIOLATION
  );
}

/**
 * Guarda los cambios de una cuenta y deja sus accesos como se pidieron.
 *
 * El permiso es el de editar y no el de crear: quien corrige un apellido no
 * tiene por qué poder dar de alta cuentas.
 */
export async function updateUser(input: unknown): Promise<UserActionResult> {
  const permission: PermissionCode = 'platform.user:update';

  try {
    const session = await requirePlatformPermission(permission);

    const parsed = updateUserSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: { code: 'VALIDATION_FAILED', fieldErrors: toFieldErrors(parsed.error) },
      };
    }

    const current = await findUser(parsed.data.id);
    if (current === null) throw new NotFoundError('La cuenta no existe o ya fue eliminada.');

    // Solo se pide el permiso cuando el acceso de plataforma cambia. Guardar un
    // apellido de alguien que ya lo tiene no es repartir privilegio.
    if (parsed.data.isPlatformAdmin !== current.isPlatformAdmin) {
      await requirePlatformPermission(
        parsed.data.isPlatformAdmin ? 'platform.admin:grant' : 'platform.admin:revoke',
      );
    }

    // Nadie se quita a sí mismo el acceso de plataforma. Si la última cuenta con
    // el privilegio se lo retira, no queda nadie que pueda devolverlo y la
    // administración de la plataforma se cierra sola.
    if (
      !parsed.data.isPlatformAdmin &&
      current.isPlatformAdmin &&
      current.id === session.userId
    ) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_FAILED',
          fieldErrors: { isPlatformAdmin: 'cannotRevokeOwnPlatformAccess' },
        },
      };
    }

    const checked = await checkAccesses(parsed.data.accesses);
    if (!checked.ok) return { ok: false, error: checked.error };

    if ((await checkEmail(parsed.data.email, parsed.data.id)) === 'TAKEN') {
      return { ok: false, error: { code: 'CONFLICT', fieldErrors: { email: 'emailTaken' } } };
    }

    const result = await saveUser(
      parsed.data.id,
      parsed.data.version,
      {
        actorId: session.userId,
        email: parsed.data.email,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        countryCode: parsed.data.countryCode,
        accesses: parsed.data.accesses,
        platformAdmin: {
          isGranted: parsed.data.isPlatformAdmin,
          reason: parsed.data.platformAdminReason,
        },
      },
      await buildAuditContext(session, permission),
    );

    if (result.outcome === 'NOT_FOUND') {
      throw new NotFoundError('La cuenta no existe o ya fue eliminada.');
    }

    if (result.outcome === 'STALE_VERSION') {
      logger.failure(
        'users.update',
        new ConflictError('La cuenta cambió mientras se editaba.'),
      );
      return { ok: false, error: { code: 'STALE_VERSION' } };
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      logger.failure('users.update', new ConflictError('Correo repetido.'));
      return { ok: false, error: { code: 'CONFLICT', fieldErrors: { email: 'emailTaken' } } };
    }

    logger.failure('users.update', error);
    return { ok: false, error: toErrorPayload(error) };
  }

  revalidatePath(USERS_PATH);
  redirect(USERS_PATH);
}

/**
 * Suspende o reactiva una cuenta.
 *
 * Surte efecto en el acto, no al expirar la sesión: cada petición vuelve a leer
 * el estado de la cuenta. RN-006.
 */
export async function setUserActive(input: unknown): Promise<UserActionResult> {
  const permission: PermissionCode = 'platform.user:suspend';

  try {
    const session = await requirePlatformPermission(permission);

    const parsed = setUserActiveSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: { code: 'VALIDATION_FAILED', fieldErrors: toFieldErrors(parsed.error) },
      };
    }

    const changed = await updateUserActive(
      parsed.data.id,
      parsed.data.isActive,
      session.userId,
      await buildAuditContext(session, permission),
    );
    if (!changed) throw new NotFoundError('La cuenta no existe o ya fue eliminada.');
  } catch (error) {
    logger.failure('users.setActive', error);
    return { ok: false, error: toErrorPayload(error) };
  }

  revalidatePath(USERS_PATH);
  return { ok: true };
}

/**
 * Elimina una cuenta.
 *
 * Se marca como borrada y se le revocan los accesos. Lo que hizo se queda en la
 * bitácora: borrar la fila dejaría esa historia apuntando al vacío.
 */
export async function deleteUser(input: unknown): Promise<UserActionResult> {
  const permission: PermissionCode = 'platform.user:delete';

  try {
    const session = await requirePlatformPermission(permission);

    const parsed = userIdSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: { code: 'VALIDATION_FAILED', fieldErrors: toFieldErrors(parsed.error) },
      };
    }

    const removed = await removeUser(
      parsed.data.id,
      session.userId,
      await buildAuditContext(session, permission),
    );
    if (!removed) throw new NotFoundError('La cuenta no existe o ya fue eliminada.');
  } catch (error) {
    logger.failure('users.delete', error);
    return { ok: false, error: toErrorPayload(error) };
  }

  revalidatePath(USERS_PATH);
  return { ok: true };
}

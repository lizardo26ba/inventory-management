'use server';

/**
 * Server Actions del dominio de almacenes.
 *
 * Delgadas: autorizan, validan, delegan y traducen el resultado. Primero el
 * permiso, porque quien no puede crear almacenes tampoco debe enterarse de si un
 * código ya existe; después el esquema, porque la lógica no debe ver un dato sin
 * validar.
 *
 * La empresa nunca llega del navegador: sale de la sesión, a través del alcance
 * de empresa. Un identificador de almacén de otra empresa no se encuentra, porque
 * el repositorio filtra por la empresa del alcance y la base lo vuelve a filtrar.
 *
 * El contexto de auditoría se construye después de autorizar y validar, con el
 * mismo permiso que se pidió, y viaja al repositorio, que escribe la entrada en la
 * misma transacción que el cambio.
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ZodError } from 'zod';

import type { PermissionCode } from '@/lib/auth/permissions';
import type { DataScope } from '@/lib/db/scope';
import { ConflictError, NotFoundError, toErrorPayload, type ErrorPayload } from '@/lib/errors';
import { logger } from '@/lib/observability/logger';
import { buildAuditContext } from '@/modules/audit';
import { companyScopeOf } from '@/modules/auth/scope';
import { requireCompanyPermission } from '@/modules/auth/session';

import {
  createWarehouse as insertWarehouse,
  listWarehouseCountryOptions,
  setWarehouseActive as updateWarehouseActive,
  updateWarehouse as saveWarehouse,
} from './repository';
import { WAREHOUSES_PATH } from './routes';
import {
  createWarehouseSchema,
  setWarehouseActiveSchema,
  updateWarehouseSchema,
} from './schema';
import { checkWarehouseLocation, type LocationCheck } from './service';

export type WarehouseActionResult =
  { readonly ok: true } | { readonly ok: false; readonly error: ErrorPayload };

/** El código de Prisma para una clave única violada. */
const UNIQUE_VIOLATION = 'P2002';

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { readonly code?: unknown }).code === UNIQUE_VIOLATION
  );
}

/** El choque de código. La clave única es por empresa y código, así que no hay otro. */
const DUPLICATE_CODE: WarehouseActionResult = {
  ok: false,
  error: { code: 'CONFLICT', fieldErrors: { code: 'duplicateWarehouseCode' } },
};

/** El primer problema de cada campo. Más de uno por campo no se puede leer. */
function toFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.join('.');
    if (field !== '' && fieldErrors[field] === undefined) fieldErrors[field] = issue.message;
  }
  return fieldErrors;
}

async function checkLocation(
  scope: DataScope,
  countryCode: string,
  timeZone: string,
): Promise<LocationCheck> {
  return checkWarehouseLocation(
    await listWarehouseCountryOptions(scope),
    countryCode,
    timeZone,
  );
}

/** Vacío y nulo no son lo mismo en la base: lo que no se dio, no está. */
function orNull(value: string): string | null {
  return value === '' ? null : value;
}

export async function createWarehouse(input: unknown): Promise<WarehouseActionResult> {
  const permission: PermissionCode = 'warehouse:create';

  try {
    const session = await requireCompanyPermission(permission);
    const scope = companyScopeOf(session);

    const parsed = createWarehouseSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: { code: 'VALIDATION_FAILED', fieldErrors: toFieldErrors(parsed.error) },
      };
    }

    const location = await checkLocation(scope, parsed.data.countryCode, parsed.data.timeZone);
    if (!location.ok) {
      return {
        ok: false,
        error: { code: 'VALIDATION_FAILED', fieldErrors: location.fieldErrors },
      };
    }

    await insertWarehouse(
      scope,
      session.userId,
      {
        code: parsed.data.code,
        name: parsed.data.name,
        address: orNull(parsed.data.address),
        countryCode: location.countryCode,
        timeZone: location.timeZone,
      },
      await buildAuditContext(session, permission),
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      logger.failure('warehouses.create', new ConflictError('Código de almacén repetido.'));
      return DUPLICATE_CODE;
    }

    logger.failure('warehouses.create', error);
    return { ok: false, error: toErrorPayload(error) };
  }

  revalidatePath(WAREHOUSES_PATH);
  redirect(WAREHOUSES_PATH);
}

/**
 * Guarda los cambios de un almacén.
 *
 * Si otra persona guardó mientras la pantalla estaba abierta, no se escribe nada
 * y se responde que la versión quedó vieja. Sobrescribir en silencio haría
 * desaparecer el trabajo del otro sin que nadie se entere.
 */
export async function updateWarehouse(input: unknown): Promise<WarehouseActionResult> {
  const permission: PermissionCode = 'warehouse:update';

  try {
    const session = await requireCompanyPermission(permission);
    const scope = companyScopeOf(session);

    const parsed = updateWarehouseSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: { code: 'VALIDATION_FAILED', fieldErrors: toFieldErrors(parsed.error) },
      };
    }

    const location = await checkLocation(scope, parsed.data.countryCode, parsed.data.timeZone);
    if (!location.ok) {
      return {
        ok: false,
        error: { code: 'VALIDATION_FAILED', fieldErrors: location.fieldErrors },
      };
    }

    const result = await saveWarehouse(
      scope,
      parsed.data.id,
      parsed.data.version,
      session.userId,
      {
        name: parsed.data.name,
        address: orNull(parsed.data.address),
        countryCode: location.countryCode,
        timeZone: location.timeZone,
      },
      await buildAuditContext(session, permission),
    );

    if (result.outcome === 'NOT_FOUND') {
      throw new NotFoundError('El almacén no existe en esta empresa.');
    }

    if (result.outcome === 'STALE_VERSION') {
      logger.failure(
        'warehouses.update',
        new ConflictError('El almacén cambió mientras se editaba.'),
      );
      return { ok: false, error: { code: 'STALE_VERSION' } };
    }
  } catch (error) {
    logger.failure('warehouses.update', error);
    return { ok: false, error: toErrorPayload(error) };
  }

  revalidatePath(WAREHOUSES_PATH);
  redirect(WAREHOUSES_PATH);
}

/**
 * Archiva o reactiva un almacén.
 *
 * Archivar no borra (RN-093): el almacén deja de aceptar movimientos y conserva
 * su historia. El permiso es el de archivar y no el de editar, porque retirar un
 * almacén de la operación es una decisión distinta de corregir su dirección.
 *
 * Un almacén con existencias no se archiva (RN-092). Es un rechazo de regla, no
 * un fallo: se responde con su motivo para que la pantalla lo explique.
 */
export async function setWarehouseActive(input: unknown): Promise<WarehouseActionResult> {
  const permission: PermissionCode = 'warehouse:archive';

  try {
    const session = await requireCompanyPermission(permission);
    const scope = companyScopeOf(session);

    const parsed = setWarehouseActiveSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: { code: 'VALIDATION_FAILED' } };
    }

    const outcome = await updateWarehouseActive(
      scope,
      parsed.data.id,
      parsed.data.isActive,
      session.userId,
      await buildAuditContext(session, permission),
    );

    if (outcome === 'NOT_FOUND') {
      throw new NotFoundError('El almacén no existe en esta empresa.');
    }

    if (outcome === 'HAS_STOCK') {
      return {
        ok: false,
        error: { code: 'VALIDATION_FAILED', fieldErrors: { isActive: 'warehouseHasStock' } },
      };
    }
  } catch (error) {
    logger.failure('warehouses.setActive', error);
    return { ok: false, error: toErrorPayload(error) };
  }

  // La fila vuelve del servidor con su estado nuevo. Sin esto, el interruptor
  // quedaría en una posición en la pantalla y en otra en la base.
  revalidatePath(WAREHOUSES_PATH);
  return { ok: true };
}

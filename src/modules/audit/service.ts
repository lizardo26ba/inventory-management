/**
 * Reglas de la bitácora que no necesitan base de datos.
 *
 * Funciones puras: se prueban sin levantar nada y no importan Prisma ni Next.
 */

import { z } from 'zod';

import { PERMISSIONS, type PermissionCode } from '@/lib/auth/permissions';
import { InternalError } from '@/lib/errors';

import {
  type AuditContext,
  type AuditEntry,
  type AuditFields,
  type AuditRow,
  type AuditValue,
  type FieldChanges,
} from './types';

/**
 * Nombres de campo que nunca entran en la bitácora.
 *
 * Una tabla de solo inserción no se puede limpiar después: una huella de
 * contraseña que se cuele se queda para siempre. Por eso esto no enmascara como
 * el registro, sino que rechaza la operación entera. Es un error de programación
 * y tiene que verse en la primera prueba, no en producción.
 */
const SENSITIVE_KEY_FRAGMENTS = [
  'password',
  'secret',
  'token',
  'hash',
  'cookie',
  'authorization',
] as const;

const MILLISECONDS_PER_DAY = 86_400_000;

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

function assertNoSensitiveFields(fields: AuditFields | null | undefined): void {
  if (fields === null || fields === undefined) return;

  for (const key of Object.keys(fields)) {
    if (isSensitiveKey(key)) {
      throw new InternalError('Campo sensible enviado a la bitácora de auditoría.', {
        context: { field: key },
      });
    }
  }
}

/**
 * Los campos que cambiaron entre dos estados, o nada si no cambió ninguno.
 *
 * La fila entera escondería el cambio real entre treinta valores iguales. Un
 * campo ausente en un lado cuenta como nulo, que es lo que era en la base.
 */
export function diffFields(before: AuditFields, after: AuditFields): FieldChanges | null {
  const changedBefore: Record<string, AuditValue> = {};
  const changedAfter: Record<string, AuditValue> = {};

  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const previous = before[key] ?? null;
    const next = after[key] ?? null;
    if (previous === next) continue;

    changedBefore[key] = previous;
    changedAfter[key] = next;
  }

  if (Object.keys(changedAfter).length === 0) return null;

  return { before: changedBefore, after: changedAfter };
}

/**
 * Si la entrada se hizo con privilegio de plataforma. RN-072.
 *
 * Dos caminos llevan ahí. Un super administrador dentro de una empresa ajena
 * lleva la marca en la sesión. Y toda operación autorizada por un permiso de
 * plataforma, como crear una empresa, es privilegio elevado aunque no haya
 * empresa de por medio: nadie más puede hacerla.
 */
export function isElevated(
  sessionActingAsPlatformAdmin: boolean,
  permissionCode: PermissionCode | null,
): boolean {
  if (sessionActingAsPlatformAdmin) return true;
  if (permissionCode === null) return false;

  return PERMISSIONS.some(
    (permission) => permission.code === permissionCode && permission.scope === 'PLATFORM',
  );
}

/** Junta el contexto de la operación con una entrada y deja la fila lista. */
export function toAuditRow(context: AuditContext, entry: AuditEntry): AuditRow {
  assertNoSensitiveFields(entry.before);
  assertNoSensitiveFields(entry.after);

  const permissionCode = entry.permissionCode ?? context.permissionCode;

  return {
    organizationId:
      entry.organizationId === undefined ? context.organizationId : entry.organizationId,
    actorId: context.actorId,
    actingAsPlatformAdmin: isElevated(context.actingAsPlatformAdmin, permissionCode),
    permissionCode,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    entityLabel: entry.entityLabel,
    before: entry.before ?? null,
    after: entry.after ?? null,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    correlationId: context.correlationId,
  };
}

/**
 * Una columna JSON acepta cualquier forma, así que al leerla hay que comprobarla.
 *
 * Lo que la aplicación escribe es siempre un objeto plano de valores simples. Si
 * lo guardado no encaja, se devuelve nada en lugar de arrastrar una forma
 * desconocida hasta la pantalla.
 */
const auditFieldsSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);

export function toAuditFields(value: unknown): AuditFields | null {
  const parsed = auditFieldsSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/**
 * El instante en que empieza un día del calendario, en tiempo universal.
 *
 * El filtro de la pantalla son días, no instantes, y la plataforma no tiene zona
 * propia: está por encima de las empresas, que sí la tienen. Se declara aquí cuál
 * se usa, que es lo que pide `docs/standards/dates-and-times.md`. Cuando la
 * bitácora se mire dentro de una empresa, el corte será el de su zona.
 */
export function startOfUtcDay(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

/** El principio del día siguiente: el corte de arriba, que no incluye su propio día. */
export function startOfNextUtcDay(day: string): Date {
  return new Date(startOfUtcDay(day).getTime() + MILLISECONDS_PER_DAY);
}

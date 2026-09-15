/**
 * Tipos de la bitácora de auditoría.
 *
 * Archivo de solo tipos y catálogos, sin importar nada que toque la base ni la
 * petición, para que el servicio se pueda probar sin levantar nada.
 */

import { type PermissionCode } from '@/lib/auth/permissions';

/**
 * Lo que puede aparecer en la bitácora.
 *
 * Cada acción es un hecho de negocio con nombre propio, no una operación de
 * base de datos: se busca por lo que pasó, no por qué tabla se tocó. La forma
 * `dominio.hecho` la exige también una restricción de la base.
 *
 * Añadir una acción es añadirla aquí. Una cadena escrita a mano en otro sitio no
 * compila.
 */
export const AUDIT_ACTIONS = [
  'organization.created',
  'organization.updated',
  'organization.activated',
  'organization.deactivated',
  'organization.deleted',
  'user.created',
  'user.updated',
  'user.activated',
  'user.deactivated',
  'user.deleted',
  'membership.granted',
  'membership.role_changed',
  'membership.revoked',
  'platform_admin.granted',
  'platform_admin.revoked',
  'auth.signed_in',
  'auth.password_changed',
  'auth.locked_out',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ENTITY_TYPES = [
  'Organization',
  'User',
  'Membership',
  'PlatformAdmin',
] as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

/** Un valor de la bitácora. Las fechas llegan ya como texto ISO. */
export type AuditValue = string | number | boolean | null;

export type AuditFields = Readonly<Record<string, AuditValue>>;

/** Los campos que cambiaron, con su valor anterior y el nuevo. */
export type FieldChanges = {
  readonly before: AuditFields;
  readonly after: AuditFields;
};

/**
 * Quién, desde dónde y con qué permiso. Es común a todas las entradas de una
 * misma operación, y por eso se construye una vez y se reparte.
 */
export type AuditContext = {
  /** Nulo solo cuando nadie se autenticó, como en un bloqueo por intentos. */
  readonly actorId: string | null;
  /** La empresa de la sesión. Cada entrada puede declarar otra, la afectada. */
  readonly organizationId: string | null;
  /** La marca de la sesión: un super administrador dentro de una empresa ajena. */
  readonly actingAsPlatformAdmin: boolean;
  /** El permiso que autorizó la operación, o ninguno si no pide permiso. */
  readonly permissionCode: PermissionCode | null;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  /** Enlaza todas las entradas de una misma operación. */
  readonly correlationId: string;
};

/** Una entrada tal como la describe el dominio que la produce. */
export type AuditEntry = {
  readonly action: AuditAction;
  readonly entityType: AuditEntityType;
  readonly entityId: string;
  /** Cómo se llamaba la entidad en ese momento: código, número o correo. */
  readonly entityLabel: string | null;
  /**
   * La empresa afectada, cuando no es la de la sesión. `null` dice que no afecta
   * a ninguna, y omitirlo toma la de la sesión. RN-072.
   */
  readonly organizationId?: string | null;
  /**
   * Un permiso distinto del de la operación. Editar una cuenta pide el de
   * editar, pero conceder el acceso de plataforma dentro de esa edición ejerce
   * el de conceder, y es ese el que tiene que quedar.
   */
  readonly permissionCode?: PermissionCode;
  /** Solo los campos que cambiaron, nunca la fila entera. */
  readonly before?: AuditFields | null;
  readonly after?: AuditFields | null;
};

/** La fila que se escribe, ya resuelta. */
export type AuditRow = {
  readonly organizationId: string | null;
  readonly actorId: string | null;
  readonly actingAsPlatformAdmin: boolean;
  readonly permissionCode: PermissionCode | null;
  readonly action: AuditAction;
  readonly entityType: AuditEntityType;
  readonly entityId: string;
  readonly entityLabel: string | null;
  readonly before: AuditFields | null;
  readonly after: AuditFields | null;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly correlationId: string;
};

/**
 * Puerta pública del dominio de auditoría.
 *
 * Los demás dominios necesitan tres cosas de aquí: construir el contexto de una
 * operación, calcular qué campos cambiaron y escribir las entradas dentro de su
 * propia transacción. La regla de CLAUDE.md dice que un módulo no importa el
 * repositorio ni el servicio de otro, sino la interfaz que este declara. Esta es
 * esa interfaz.
 *
 * La pantalla de la bitácora añade la otra mitad: leer. Es lectura de plataforma,
 * por encima de todas las empresas, y quien la usa comprueba antes el permiso.
 */

export { buildAuditContext, type AuditActor } from './context';
export {
  findPlatformAuditEntry,
  listPlatformAuditEntries,
  recordAuditEntries,
} from './repository';
export {
  AUDIT_ENTRY_PARAM,
  AUDIT_PAGE_SIZE_OPTIONS,
  DEFAULT_AUDIT_PAGE_SIZE,
  PLATFORM_SCOPE,
  parseAuditListQuery,
  type AuditListQuery,
} from './schema';
export { diffFields } from './service';
export {
  AUDIT_ACTIONS,
  type AuditAction,
  type AuditContext,
  type AuditEntry,
  type AuditFields,
  type AuditLogDetail,
  type AuditLogListItem,
  type AuditLogPage,
} from './types';

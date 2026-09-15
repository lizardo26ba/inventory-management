/**
 * Puerta pública del dominio de auditoría.
 *
 * Los demás dominios necesitan tres cosas de aquí: construir el contexto de una
 * operación, calcular qué campos cambiaron y escribir las entradas dentro de su
 * propia transacción. La regla de CLAUDE.md dice que un módulo no importa el
 * repositorio ni el servicio de otro, sino la interfaz que este declara. Esta es
 * esa interfaz.
 */

export { buildAuditContext, type AuditActor } from './context';
export { recordAuditEntries } from './repository';
export { diffFields } from './service';
export {
  AUDIT_ACTIONS,
  type AuditAction,
  type AuditContext,
  type AuditEntry,
  type AuditFields,
} from './types';

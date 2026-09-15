import 'server-only';

/**
 * El contexto de auditoría de una operación.
 *
 * Se construye en la acción, después de autorizar, y viaja hasta el repositorio
 * que escribe. No importa el módulo de autenticación: recibe lo que necesita de
 * la sesión como dato, porque autenticación también escribe en la bitácora y la
 * dependencia en los dos sentidos sería un ciclo.
 */

import { randomUUID } from 'node:crypto';

import { type PermissionCode } from '@/lib/auth/permissions';
import { requestFingerprint } from '@/lib/observability/request';

import { type AuditContext } from './types';

/** Lo que la auditoría necesita saber de quien opera. La sesión ya lo cumple. */
export type AuditActor = {
  readonly userId: string | null;
  readonly organizationId: string | null;
  readonly actingAsPlatformAdmin: boolean;
};

export async function buildAuditContext(
  actor: AuditActor,
  permissionCode: PermissionCode | null,
): Promise<AuditContext> {
  const fingerprint = await requestFingerprint();

  return {
    actorId: actor.userId,
    organizationId: actor.organizationId,
    actingAsPlatformAdmin: actor.actingAsPlatformAdmin,
    permissionCode,
    ipAddress: fingerprint.ipAddress,
    userAgent: fingerprint.userAgent,
    // Uno por operación, no por entrada: es lo que permite ver que la cuenta
    // creada, sus accesos y su privilegio salieron del mismo guardado.
    correlationId: randomUUID(),
  };
}

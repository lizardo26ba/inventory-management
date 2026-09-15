import 'server-only';

/**
 * Único lugar del dominio de auditoría que habla con Prisma.
 *
 * Solo inserta. No hay función para editar ni para borrar porque la bitácora no
 * se edita ni se borra, y la base lo rechazaría igual. RN-071.
 *
 * Recibe la transacción en lugar de abrir la suya, y no acepta el cliente suelto.
 * La entrada tiene que escribirse dentro de la misma transacción que el cambio
 * que describe: si el cambio se revierte, la entrada también, y si la entrada no
 * se puede escribir, el cambio no ocurre. Pedir la transacción en la firma es lo
 * que impide olvidarlo.
 */

import { type Prisma } from '@prisma/client';

import { toAuditRow } from './service';
import { type AuditContext, type AuditEntry } from './types';

export async function recordAuditEntries(
  tx: Prisma.TransactionClient,
  context: AuditContext,
  entries: readonly AuditEntry[],
): Promise<void> {
  if (entries.length === 0) return;

  await tx.auditLog.createMany({
    data: entries.map((entry) => {
      const row = toAuditRow(context, entry);
      // Una columna JSON anulable no acepta null en Prisma: se omite y queda nula.
      return { ...row, before: row.before ?? undefined, after: row.after ?? undefined };
    }),
  });
}

/**
 * La bitácora no se edita ni se borra. RN-071.
 *
 * La regla la defiende un disparador de la base, no el código: la aplicación ni siquiera
 * tiene una función para editar. Por eso solo una prueba contra una base real puede
 * comprobarla, y es la que confirma que la migración `20260915050000_bitacora_de_auditoria`
 * sigue en pie.
 *
 * Cada prueba escribe su propia entrada con una correlación única. La tabla no se puede
 * vaciar, así que ninguna prueba cuenta con que esté vacía.
 */

import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/db/client';
import { recordAuditEntries, type AuditContext } from '@/modules/audit';

/** Lo que dice el disparador cuando rechaza un cambio. */
const APPEND_ONLY_MESSAGE = /solo insercion/;

/** Dirección del rango reservado para documentación. No es de nadie. */
function contextFor(correlationId: string): AuditContext {
  return {
    actorId: null,
    organizationId: null,
    actingAsPlatformAdmin: false,
    permissionCode: null,
    ipAddress: '203.0.113.9',
    userAgent: 'suite-de-integracion',
    correlationId,
  };
}

async function writeEntry(): Promise<string> {
  const correlationId = randomUUID();

  await prisma.$transaction((tx) =>
    recordAuditEntries(tx, contextFor(correlationId), [
      {
        action: 'auth.locked_out',
        entityType: 'User',
        entityId: randomUUID(),
        entityLabel: 'bloqueo@example.test',
      },
    ]),
  );

  const row = await prisma.auditLog.findFirstOrThrow({
    where: { correlationId },
    select: { id: true },
  });
  return row.id;
}

describe('bitácora de solo inserción', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rechaza editar una entrada ya escrita', async () => {
    const id = await writeEntry();

    await expect(
      prisma.auditLog.update({ where: { id }, data: { entityLabel: 'otro' } }),
    ).rejects.toThrow(APPEND_ONLY_MESSAGE);
  });

  it('rechaza borrar una entrada ya escrita', async () => {
    const id = await writeEntry();

    await expect(prisma.auditLog.delete({ where: { id } })).rejects.toThrow(
      APPEND_ONLY_MESSAGE,
    );
  });

  it('rechaza vaciar la tabla entera', async () => {
    await writeEntry();

    // Consulta sin procesar a propósito: Prisma no ofrece TRUNCATE, y es justo lo que el
    // disparador de sentencia tiene que rechazar. Plantilla etiquetada, sin parámetros.
    await expect(prisma.$executeRaw`TRUNCATE audit_logs`).rejects.toThrow(APPEND_ONLY_MESSAGE);
  });
});

/**
 * La lectura de la bitácora contra una base real.
 *
 * Aquí se comprueba lo que ninguna prueba unitaria puede: que la paginación por
 * cursor no pierde ni repite filas, incluso cuando varias entradas comparten
 * instante porque salieron de la misma operación, y que los filtros llegan a la
 * consulta tal como se piden.
 *
 * Cada prueba escribe sus propias entradas con una correlación única y consulta
 * filtrando por ella. La tabla no se puede vaciar (RN-071), así que ninguna prueba
 * puede contar con que esté vacía ni molestar a las demás.
 */

import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/db/client';
import {
  findPlatformAuditEntry,
  listPlatformAuditEntries,
  recordAuditEntries,
  type AuditListQuery,
} from '@/modules/audit';
import { type AuditContext, type AuditEntry } from '@/modules/audit/types';

const PAGE_SIZE = 2;

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

function entry(label: string, overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    action: 'user.updated',
    entityType: 'User',
    entityId: randomUUID(),
    entityLabel: label,
    ...overrides,
  };
}

/** Una operación: todas sus entradas comparten instante y correlación. */
async function writeOperation(
  correlationId: string,
  entries: readonly AuditEntry[],
): Promise<void> {
  await prisma.$transaction((tx) => recordAuditEntries(tx, contextFor(correlationId), entries));
}

/**
 * La consulta tal como la recibe el repositorio. No pasa por el esquema de la
 * dirección a propósito: aquel limita el tamaño al menú de la pantalla, y aquí
 * hacen falta páginas pequeñas para que los casos quepan en pocas filas.
 */
function query(overrides: Partial<AuditListQuery> = {}): AuditListQuery {
  return { pageSize: PAGE_SIZE, ...overrides };
}

async function labelsOf(correlationId: string, cursor: Partial<AuditListQuery> = {}) {
  const page = await listPlatformAuditEntries(query({ correlationId, ...cursor }));
  return {
    labels: page.items.map((item) => item.entityLabel),
    newerCursor: page.newerCursor,
    olderCursor: page.olderCursor,
  };
}

describe('lectura de la bitácora', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('devuelve lo más reciente primero y avanza hacia atrás sin repetir ni perder filas', async () => {
    const correlationId = randomUUID();
    // Cada una en su propia operación, así que cada una tiene su instante.
    for (const label of ['uno', 'dos', 'tres', 'cuatro', 'cinco']) {
      await writeOperation(correlationId, [entry(label)]);
    }

    const first = await labelsOf(correlationId);
    expect(first.labels).toEqual(['cinco', 'cuatro']);
    expect(first.newerCursor).toBeNull();

    const second = await labelsOf(correlationId, { older: first.olderCursor ?? '' });
    expect(second.labels).toEqual(['tres', 'dos']);

    const third = await labelsOf(correlationId, { older: second.olderCursor ?? '' });
    expect(third.labels).toEqual(['uno']);
    expect(third.olderCursor).toBeNull();

    const back = await labelsOf(correlationId, { newer: third.newerCursor ?? '' });
    expect(back.labels).toEqual(['tres', 'dos']);
    expect(back.olderCursor).not.toBeNull();
  });

  it('no pierde entradas que comparten instante por venir de la misma operación', async () => {
    const correlationId = randomUUID();
    await writeOperation(correlationId, [entry('a'), entry('b'), entry('c')]);

    const first = await labelsOf(correlationId);
    expect(first.labels).toHaveLength(PAGE_SIZE);

    const second = await labelsOf(correlationId, { older: first.olderCursor ?? '' });

    const seen = [...first.labels, ...second.labels];
    expect(new Set(seen).size).toBe(3);
    expect([...seen].sort()).toEqual(['a', 'b', 'c']);
  });

  it('un cursor que ya no existe vuelve a la primera página en lugar de vaciar la tabla', async () => {
    const correlationId = randomUUID();
    await writeOperation(correlationId, [entry('única')]);

    const page = await labelsOf(correlationId, { older: randomUUID() });

    expect(page.labels).toEqual(['única']);
  });

  it('filtra por acción dentro de la misma operación', async () => {
    const correlationId = randomUUID();
    await writeOperation(correlationId, [
      entry('editada', { action: 'user.updated' }),
      entry('suspendida', { action: 'user.deactivated' }),
    ]);

    const page = await listPlatformAuditEntries(
      query({ correlationId, action: 'user.deactivated' }),
    );

    expect(page.items.map((item) => item.entityLabel)).toEqual(['suspendida']);
  });

  it('filtra por día completo en tiempo universal', async () => {
    const correlationId = randomUUID();
    await writeOperation(correlationId, [entry('de hoy')]);

    const today = new Date().toISOString().slice(0, 10);
    const dentro = await listPlatformAuditEntries(query({ correlationId, from: today }));
    const fuera = await listPlatformAuditEntries(query({ correlationId, to: '2020-01-01' }));

    expect(dentro.items).toHaveLength(1);
    expect(fuera.items).toHaveLength(0);
  });

  it('el detalle trae el antes y el después tal como se guardaron', async () => {
    const correlationId = randomUUID();
    await writeOperation(correlationId, [
      entry('con cambios', {
        before: { status: 'ACTIVE', attempts: 0 },
        after: { status: 'SUSPENDED', attempts: 5 },
      }),
    ]);

    const page = await listPlatformAuditEntries(query({ correlationId }));
    const id = page.items[0]?.id ?? '';
    const detail = await findPlatformAuditEntry(id);

    expect(detail?.before).toEqual({ status: 'ACTIVE', attempts: 0 });
    expect(detail?.after).toEqual({ status: 'SUSPENDED', attempts: 5 });
    expect(detail?.ipAddress).toBe('203.0.113.9');
  });

  it('un identificador que no existe no es un error, es que no hay nada', async () => {
    expect(await findPlatformAuditEntry(randomUUID())).toBeNull();
  });
});

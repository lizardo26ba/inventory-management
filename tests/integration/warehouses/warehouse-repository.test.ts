/**
 * El repositorio de almacenes contra una base real.
 *
 * Lo que solo una base puede decir:
 *
 * - Un almacén nace en la empresa del alcance, con su entrada en la bitácora.
 * - El código es único por empresa, no en toda la plataforma, y la base rechaza
 *   por sí sola uno mal formado (RN-090), aunque llegue por otro camino.
 * - Desde otra empresa, un almacén no se encuentra, no se edita y no se archiva.
 * - La versión protege la edición, y la bitácora guarda solo lo que cambió.
 * - Un almacén con existencias no se archiva (RN-092); con saldo en cero, sí.
 *
 * Cada prueba crea sus propios almacenes, con códigos que no se repiten, porque la
 * bitácora no se puede vaciar y la base se comparte entre pruebas del archivo.
 */

import { randomUUID } from 'node:crypto';

import { beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/db/client';
import type { DataScope } from '@/lib/db/scope';
import type { AuditContext } from '@/modules/audit';
import {
  createWarehouse,
  findWarehouseByCode,
  listWarehouses,
  setWarehouseActive,
  updateWarehouse,
} from '@/modules/warehouses/repository';

const ACTOR = randomUUID();
const COMPANY_A = randomUUID();
const COMPANY_B = randomUUID();

const SCOPE_A: DataScope = {
  organizationId: COMPANY_A,
  userId: null,
  actingAsPlatformAdmin: false,
};
const SCOPE_B: DataScope = { ...SCOPE_A, organizationId: COMPANY_B };

const LIST_ALL = { search: '', sort: 'name', direction: 'asc' } as const;

let codeCounter = 0;

/** Un código válido y distinto en cada llamada: RN-090 admite hasta diez. */
function nextCode(): string {
  codeCounter += 1;
  return `T-${String(codeCounter).padStart(4, '0')}`;
}

function auditContext(organizationId: string, correlationId: string): AuditContext {
  return {
    actorId: ACTOR,
    organizationId,
    actingAsPlatformAdmin: false,
    permissionCode: 'warehouse:create',
    ipAddress: '203.0.113.9',
    userAgent: 'suite-de-integracion',
    correlationId,
  };
}

async function newWarehouse(
  scope: DataScope,
  code = nextCode(),
): Promise<{ readonly id: string; readonly code: string }> {
  const organizationId = scope.organizationId ?? '';
  const { id } = await createWarehouse(
    scope,
    ACTOR,
    {
      code,
      name: `Bodega ${code}`,
      address: null,
      countryCode: 'GT',
      timeZone: 'America/Guatemala',
    },
    auditContext(organizationId, randomUUID()),
  );
  return { id, code };
}

async function versionOf(id: string): Promise<number> {
  const row = await prisma.warehouse.findUniqueOrThrow({
    where: { id },
    select: { version: true },
  });
  return row.version;
}

async function isActive(id: string): Promise<boolean> {
  const row = await prisma.warehouse.findUniqueOrThrow({
    where: { id },
    select: { isActive: true },
  });
  return row.isActive;
}

/** Deja un saldo del producto de prueba en el almacén, con la cantidad pedida. */
async function putStock(warehouseId: string, quantity: string): Promise<void> {
  const productId = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO products (id, organization_id, sku, name, unit_id, version, created_by_id,
      updated_by_id, created_at, updated_at)
    VALUES (${productId}, ${COMPANY_A}, ${`SKU-${productId.slice(0, 8)}`}, 'Producto de prueba',
      ${UNIT_A}, 0, ${ACTOR}, ${ACTOR}, now(), now())
  `;
  await prisma.$executeRaw`
    INSERT INTO stock_levels (id, organization_id, product_id, warehouse_id, quantity, version,
      updated_at)
    VALUES (${randomUUID()}, ${COMPANY_A}, ${productId}, ${warehouseId}, ${quantity}::numeric, 0,
      now())
  `;
}

const UNIT_A = randomUUID();

beforeAll(async () => {
  await prisma.$executeRaw`
    INSERT INTO currencies (id, code, name, symbol, decimal_places, is_active)
    VALUES (${randomUUID()}, 'GTQ', 'Quetzal', 'Q', 2, true)
    ON CONFLICT (code) DO NOTHING
  `;
  await prisma.$executeRaw`
    INSERT INTO countries (id, code, name, default_currency_code, default_time_zone,
      tax_id_label, phone_prefix, phone_mask, phone_example, is_active)
    VALUES (${randomUUID()}, 'GT', 'Guatemala', 'GTQ', 'America/Guatemala',
      'NIT', '+502', '#### ####', '2200 1100', true)
    ON CONFLICT (code) DO NOTHING
  `;
  await prisma.$executeRaw`
    INSERT INTO users (id, email, password_hash, first_name, last_name, status, locale,
      country_code, must_change_password, failed_login_attempts, version, created_by_id,
      updated_by_id, created_at, updated_at)
    VALUES (${ACTOR}, ${`almacenes-${ACTOR}@example.test`}, 'sin-uso', 'Cuenta', 'Prueba',
      'ACTIVE', 'es', 'GT', false, 0, 0, ${ACTOR}, ${ACTOR}, now(), now())
  `;

  for (const [id, name] of [
    [COMPANY_A, 'Almacenes A'],
    [COMPANY_B, 'Almacenes B'],
  ] as const) {
    await prisma.$executeRaw`
      INSERT INTO organizations (id, slug, name, legal_name, country_code, base_currency_code,
        time_zone, locale, is_active, version, created_by_id, updated_by_id, created_at,
        updated_at)
      VALUES (${id}, ${`alm-${id.slice(0, 8)}`}, ${name}, ${name}, 'GT', 'GTQ',
        'America/Guatemala', 'es', true, 0, ${ACTOR}, ${ACTOR}, now(), now())
    `;
  }

  await prisma.$executeRaw`
    INSERT INTO units_of_measure (id, organization_id, code, name, version, created_by_id,
      updated_by_id, created_at, updated_at)
    VALUES (${UNIT_A}, ${COMPANY_A}, 'UND', 'Unidad', 0, ${ACTOR}, ${ACTOR}, now(), now())
  `;
});

describe('alta', () => {
  it('nace en la empresa del alcance, con su entrada en la bitácora', async () => {
    const correlationId = randomUUID();
    const code = nextCode();

    const { id } = await createWarehouse(
      SCOPE_A,
      ACTOR,
      {
        code,
        name: 'Bodega central',
        address: '12 Avenida',
        countryCode: 'GT',
        timeZone: 'America/Guatemala',
      },
      auditContext(COMPANY_A, correlationId),
    );

    const row = await prisma.warehouse.findUniqueOrThrow({
      where: { id },
      select: { organizationId: true, createdById: true, isActive: true },
    });
    expect(row).toEqual({ organizationId: COMPANY_A, createdById: ACTOR, isActive: true });

    const entries = await prisma.auditLog.findMany({
      where: { correlationId },
      select: { action: true, organizationId: true, entityId: true },
    });
    expect(entries).toEqual([
      { action: 'warehouse.created', organizationId: COMPANY_A, entityId: id },
    ]);
  });

  it('el mismo código choca dentro de la empresa, pero no con otra empresa', async () => {
    const { code } = await newWarehouse(SCOPE_A);

    await expect(newWarehouse(SCOPE_A, code)).rejects.toMatchObject({ code: 'P2002' });
    await expect(newWarehouse(SCOPE_B, code)).resolves.toMatchObject({ code });
  });

  it('la base rechaza un código mal formado aunque no pase por la frontera (RN-090)', async () => {
    await expect(newWarehouse(SCOPE_A, 'minusculas')).rejects.toThrow(/warehouses_code_format/);
  });
});

describe('aislamiento entre empresas', () => {
  it('desde otra empresa no se encuentra, no se lista, no se edita y no se archiva', async () => {
    const { id, code } = await newWarehouse(SCOPE_A);
    const version = await versionOf(id);

    expect(await findWarehouseByCode(SCOPE_B, code)).toBeNull();
    const listed = await listWarehouses(SCOPE_B, LIST_ALL);
    expect(listed.items.map((item) => item.id)).not.toContain(id);

    const edit = await updateWarehouse(
      SCOPE_B,
      id,
      version,
      ACTOR,
      { name: 'Robado', address: null, countryCode: 'GT', timeZone: 'America/Guatemala' },
      auditContext(COMPANY_B, randomUUID()),
    );
    expect(edit).toEqual({ outcome: 'NOT_FOUND' });

    const archive = await setWarehouseActive(
      SCOPE_B,
      id,
      false,
      ACTOR,
      auditContext(COMPANY_B, randomUUID()),
    );
    expect(archive).toBe('NOT_FOUND');

    expect(await versionOf(id)).toBe(version);
    expect(await isActive(id)).toBe(true);
  });
});

describe('edición', () => {
  it('sube la versión y registra solo lo que cambió', async () => {
    const { id, code } = await newWarehouse(SCOPE_A);
    const correlationId = randomUUID();

    const result = await updateWarehouse(
      SCOPE_A,
      id,
      await versionOf(id),
      ACTOR,
      {
        name: `Bodega ${code}`,
        address: 'Km 8.5',
        countryCode: 'GT',
        timeZone: 'America/Guatemala',
      },
      auditContext(COMPANY_A, correlationId),
    );

    expect(result).toEqual({ outcome: 'UPDATED' });
    expect(await versionOf(id)).toBe(1);

    const entries = await prisma.auditLog.findMany({
      where: { correlationId },
      select: { action: true, before: true, after: true },
    });
    expect(entries).toEqual([
      { action: 'warehouse.updated', before: { address: null }, after: { address: 'Km 8.5' } },
    ]);
  });

  it('con una versión vieja no escribe nada', async () => {
    const { id } = await newWarehouse(SCOPE_A);

    const result = await updateWarehouse(
      SCOPE_A,
      id,
      (await versionOf(id)) + 1,
      ACTOR,
      { name: 'Pisado', address: null, countryCode: 'GT', timeZone: 'America/Guatemala' },
      auditContext(COMPANY_A, randomUUID()),
    );

    expect(result).toEqual({ outcome: 'STALE_VERSION' });
    const row = await prisma.warehouse.findUniqueOrThrow({
      where: { id },
      select: { name: true },
    });
    expect(row.name).not.toBe('Pisado');
  });
});

describe('archivar (RN-092, RN-093)', () => {
  it('no archiva un almacén con existencias, ni deja rastro', async () => {
    const { id } = await newWarehouse(SCOPE_A);
    await putStock(id, '5');
    const correlationId = randomUUID();

    const result = await setWarehouseActive(
      SCOPE_A,
      id,
      false,
      ACTOR,
      auditContext(COMPANY_A, correlationId),
    );

    expect(result).toBe('HAS_STOCK');
    expect(await isActive(id)).toBe(true);
    expect(await prisma.auditLog.count({ where: { correlationId } })).toBe(0);
  });

  it('con el saldo en cero sí se archiva, y se puede reactivar', async () => {
    const { id } = await newWarehouse(SCOPE_A);
    await putStock(id, '0');
    const archived = randomUUID();
    const reactivated = randomUUID();

    expect(
      await setWarehouseActive(SCOPE_A, id, false, ACTOR, auditContext(COMPANY_A, archived)),
    ).toBe('UPDATED');
    expect(await isActive(id)).toBe(false);

    expect(
      await setWarehouseActive(SCOPE_A, id, true, ACTOR, auditContext(COMPANY_A, reactivated)),
    ).toBe('UPDATED');
    expect(await isActive(id)).toBe(true);

    const actions = await prisma.auditLog.findMany({
      where: { correlationId: { in: [archived, reactivated] } },
      select: { action: true },
      orderBy: { createdAt: 'asc' },
    });
    expect(actions.map((entry) => entry.action)).toEqual([
      'warehouse.archived',
      'warehouse.activated',
    ]);
  });

  it('pedir el estado que ya tenía no deja rastro', async () => {
    const { id } = await newWarehouse(SCOPE_A);
    const correlationId = randomUUID();

    expect(
      await setWarehouseActive(
        SCOPE_A,
        id,
        true,
        ACTOR,
        auditContext(COMPANY_A, correlationId),
      ),
    ).toBe('UPDATED');
    expect(await prisma.auditLog.count({ where: { correlationId } })).toBe(0);
  });
});

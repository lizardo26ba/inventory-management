/**
 * Las Server Actions de almacenes, con la base simulada.
 *
 * Lo que fijan:
 *
 * - Sin sesión o sin permiso, se rechaza antes de tocar la base y antes de
 *   preparar la bitácora. Cada acción pide su propio permiso.
 * - Una entrada inválida no llega al repositorio.
 * - Los rechazos de regla vuelven con su motivo: código repetido, zona de otro
 *   país, almacén con existencias (RN-092).
 * - Un almacén de otra empresa no se encuentra, y una versión vieja no pisa.
 *
 * El comportamiento contra una base real, con la seguridad a nivel de fila y la
 * bitácora, está en la suite de integración.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthenticationError, AuthorizationError } from '@/lib/errors';

const ORGANIZATION_ID = '0199a0b0-0000-7000-8000-00000000000a';
const WAREHOUSE_ID = '0199a0b0-0000-7000-8000-00000000000b';
const USER_ID = '0199a0b0-0000-7000-8000-00000000000c';

const SCOPE = { organizationId: ORGANIZATION_ID, userId: null, actingAsPlatformAdmin: false };
const AUDIT = { correlationId: 'correlacion-de-prueba' };

const requireCompanyPermission = vi.fn();
const buildAuditContext = vi.fn();
const insertWarehouse = vi.fn();
const saveWarehouse = vi.fn();
const setActiveInDatabase = vi.fn();
const revalidatePath = vi.fn();
const redirect = vi.fn();

vi.mock('@/modules/auth/session', () => ({
  requireCompanyPermission: (code: string) => requireCompanyPermission(code),
}));

vi.mock('@/modules/auth/scope', () => ({
  companyScopeOf: () => SCOPE,
}));

vi.mock('@/modules/audit', () => ({
  buildAuditContext: (...args: readonly unknown[]) => buildAuditContext(...args),
}));

vi.mock('@/modules/warehouses/repository', () => ({
  createWarehouse: (...args: readonly unknown[]) => insertWarehouse(...args),
  updateWarehouse: (...args: readonly unknown[]) => saveWarehouse(...args),
  setWarehouseActive: (...args: readonly unknown[]) => setActiveInDatabase(...args),
  listWarehouseCountryOptions: () =>
    Promise.resolve([
      { code: 'GT', name: 'Guatemala', phonePrefix: '+502', timeZones: ['America/Guatemala'] },
    ]),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => revalidatePath(path),
}));

vi.mock('next/navigation', () => ({
  redirect: (path: string) => redirect(path),
}));

// El rechazo es el resultado esperado, no un incidente que escribir en consola.
vi.mock('@/lib/observability/logger', () => ({
  logger: { failure: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const { createWarehouse, setWarehouseActive, updateWarehouse } =
  await import('@/modules/warehouses/actions');

const CREATE_INPUT = {
  code: 'main',
  name: 'Bodega central',
  address: '',
  countryCode: 'GT',
  timeZone: 'America/Guatemala',
};

const UPDATE_INPUT = {
  id: WAREHOUSE_ID,
  version: 2,
  name: 'Bodega central',
  address: '12 Avenida',
  countryCode: 'GT',
  timeZone: 'America/Guatemala',
};

const ARCHIVE_INPUT = { id: WAREHOUSE_ID, isActive: false };

function grantEverything(): void {
  requireCompanyPermission.mockResolvedValue({
    userId: USER_ID,
    organizationId: ORGANIZATION_ID,
    actingAsPlatformAdmin: false,
  });
  buildAuditContext.mockResolvedValue(AUDIT);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('sin sesión', () => {
  beforeEach(() => {
    requireCompanyPermission.mockRejectedValue(new AuthenticationError('Sin sesión.'));
  });

  it('ninguna acción escribe, y las tres dicen que falta autenticarse', async () => {
    const results = await Promise.all([
      createWarehouse(CREATE_INPUT),
      updateWarehouse(UPDATE_INPUT),
      setWarehouseActive(ARCHIVE_INPUT),
    ]);

    for (const result of results) {
      expect(result).toEqual({ ok: false, error: { code: 'NOT_AUTHENTICATED' } });
    }
    expect(insertWarehouse).not.toHaveBeenCalled();
    expect(saveWarehouse).not.toHaveBeenCalled();
    expect(setActiveInDatabase).not.toHaveBeenCalled();
  });
});

describe('con sesión pero sin permiso', () => {
  beforeEach(() => {
    requireCompanyPermission.mockRejectedValue(new AuthorizationError('Falta el permiso.'));
  });

  it('no deja crear un almacén', async () => {
    expect(await createWarehouse(CREATE_INPUT)).toEqual({
      ok: false,
      error: { code: 'NOT_AUTHORIZED' },
    });
    expect(insertWarehouse).not.toHaveBeenCalled();
  });

  it('no deja guardar cambios', async () => {
    expect(await updateWarehouse(UPDATE_INPUT)).toEqual({
      ok: false,
      error: { code: 'NOT_AUTHORIZED' },
    });
    expect(saveWarehouse).not.toHaveBeenCalled();
  });

  it('no deja archivar', async () => {
    expect(await setWarehouseActive(ARCHIVE_INPUT)).toEqual({
      ok: false,
      error: { code: 'NOT_AUTHORIZED' },
    });
    expect(setActiveInDatabase).not.toHaveBeenCalled();
  });

  it('no llega a preparar la bitácora: un rechazo no es una operación', async () => {
    await createWarehouse(CREATE_INPUT);
    await updateWarehouse(UPDATE_INPUT);
    await setWarehouseActive(ARCHIVE_INPUT);

    expect(buildAuditContext).not.toHaveBeenCalled();
  });
});

describe('cada acción pide su propio permiso', () => {
  beforeEach(() => {
    requireCompanyPermission.mockRejectedValue(new AuthorizationError('Falta el permiso.'));
  });

  it.each([
    ['crear', () => createWarehouse(CREATE_INPUT), 'warehouse:create'],
    ['editar', () => updateWarehouse(UPDATE_INPUT), 'warehouse:update'],
    [
      'archivar, que no es editar',
      () => setWarehouseActive(ARCHIVE_INPUT),
      'warehouse:archive',
    ],
  ])('%s', async (_name, run, permission) => {
    await run();

    expect(requireCompanyPermission).toHaveBeenCalledWith(permission);
  });
});

describe('con permiso', () => {
  beforeEach(grantEverything);

  it('crea con el código normalizado, en la empresa de la sesión, y vuelve a la lista', async () => {
    insertWarehouse.mockResolvedValue({ id: WAREHOUSE_ID });

    await createWarehouse(CREATE_INPUT);

    expect(insertWarehouse).toHaveBeenCalledWith(
      SCOPE,
      USER_ID,
      {
        code: 'MAIN',
        name: 'Bodega central',
        address: null,
        countryCode: 'GT',
        timeZone: 'America/Guatemala',
      },
      AUDIT,
    );
    expect(buildAuditContext).toHaveBeenCalledWith(expect.anything(), 'warehouse:create');
    expect(redirect).toHaveBeenCalledWith('/warehouses');
  });

  it('no acepta la empresa desde el navegador', async () => {
    const result = await createWarehouse({ ...CREATE_INPUT, organizationId: 'otra' });

    expect(result).toMatchObject({ ok: false, error: { code: 'VALIDATION_FAILED' } });
    expect(insertWarehouse).not.toHaveBeenCalled();
  });

  it('una entrada inválida no llega a la base y dice qué campo falló', async () => {
    const result = await createWarehouse({ ...CREATE_INPUT, code: 'con espacio' });

    expect(result).toEqual({
      ok: false,
      error: { code: 'VALIDATION_FAILED', fieldErrors: { code: 'invalidWarehouseCode' } },
    });
    expect(insertWarehouse).not.toHaveBeenCalled();
  });

  it('rechaza una zona horaria que no es del país elegido', async () => {
    const result = await createWarehouse({ ...CREATE_INPUT, timeZone: 'America/Cancun' });

    expect(result).toEqual({
      ok: false,
      error: { code: 'VALIDATION_FAILED', fieldErrors: { timeZone: 'unknownTimeZone' } },
    });
    expect(insertWarehouse).not.toHaveBeenCalled();
  });

  it('traduce el choque de la clave única a código repetido', async () => {
    insertWarehouse.mockRejectedValue({ code: 'P2002' });

    expect(await createWarehouse(CREATE_INPUT)).toEqual({
      ok: false,
      error: { code: 'CONFLICT', fieldErrors: { code: 'duplicateWarehouseCode' } },
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('un almacén de otra empresa no se encuentra', async () => {
    saveWarehouse.mockResolvedValue({ outcome: 'NOT_FOUND' });

    expect(await updateWarehouse(UPDATE_INPUT)).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
  });

  it('con una versión vieja no pisa el trabajo de otra persona', async () => {
    saveWarehouse.mockResolvedValue({ outcome: 'STALE_VERSION' });

    expect(await updateWarehouse(UPDATE_INPUT)).toEqual({
      ok: false,
      error: { code: 'STALE_VERSION' },
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('no archiva un almacén con existencias, y dice por qué (RN-092)', async () => {
    setActiveInDatabase.mockResolvedValue('HAS_STOCK');

    expect(await setWarehouseActive(ARCHIVE_INPUT)).toEqual({
      ok: false,
      error: { code: 'VALIDATION_FAILED', fieldErrors: { isActive: 'warehouseHasStock' } },
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('archiva y refresca la lista', async () => {
    setActiveInDatabase.mockResolvedValue('UPDATED');

    expect(await setWarehouseActive(ARCHIVE_INPUT)).toEqual({ ok: true });
    expect(setActiveInDatabase).toHaveBeenCalledWith(
      SCOPE,
      WAREHOUSE_ID,
      false,
      USER_ID,
      AUDIT,
    );
    expect(revalidatePath).toHaveBeenCalledWith('/warehouses');
  });
});

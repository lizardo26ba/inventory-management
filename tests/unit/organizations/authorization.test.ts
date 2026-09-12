/**
 * Pruebas negativas de autorización.
 *
 * Lo que fijan no es que la acción funcione, sino que **no** funcione sin
 * permiso, y que se niegue antes de tocar la base. El orden importa tanto como
 * el resultado: una acción que consulta primero y comprueba después ya filtró
 * información aunque termine rechazando.
 *
 * El repositorio va simulado a propósito. Si alguien invierte ese orden, aquí se
 * ve como una llamada que no debía ocurrir, no como una consulta lenta.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthorizationError } from '@/lib/errors';

const requirePlatformPermission = vi.fn();
const setOrganizationActiveInDatabase = vi.fn();
const softDeleteOrganization = vi.fn();
const saveOrganization = vi.fn();

vi.mock('@/modules/auth/session', () => ({
  requirePlatformPermission: (code: string) => requirePlatformPermission(code),
}));

vi.mock('@/modules/organizations/repository', () => ({
  createOrganization: vi.fn(),
  findOrganizationBySlug: vi.fn(),
  listCountryOptions: vi.fn(),
  listTakenSlugs: vi.fn(),
  setOrganizationActive: (id: string, isActive: boolean) =>
    setOrganizationActiveInDatabase(id, isActive),
  softDeleteOrganization: (id: string) => softDeleteOrganization(id),
  updateOrganization: (...args: readonly unknown[]) => saveOrganization(...args),
}));

// El registro escribe el fallo por consola. Aquí estorba: el rechazo es el
// resultado esperado, no un incidente.
vi.mock('@/lib/observability/logger', () => ({
  logger: { failure: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const { createOrganization, deleteOrganization, setOrganizationActive, updateOrganization } =
  await import('@/modules/organizations/actions');

/** Lo mínimo que el esquema de edición acepta, para llegar al permiso. */
const EDIT_INPUT = {
  id: '00000000-0000-4000-8000-000000000000',
  version: 3,
  name: 'Distribuidora Central',
  legalName: 'Distribuidora Central, Sociedad Anonima',
  countryCode: 'GT',
};

const SOME_ORGANIZATION_ID = '00000000-0000-4000-8000-000000000000';

beforeEach(() => {
  vi.clearAllMocks();
  requirePlatformPermission.mockRejectedValue(
    new AuthorizationError('La sesión no es de un super administrador.'),
  );
});

describe('sin permiso de plataforma', () => {
  it('no deja encender ni apagar una empresa', async () => {
    const result = await setOrganizationActive({
      id: SOME_ORGANIZATION_ID,
      isActive: false,
    });

    expect(result).toEqual({ ok: false, error: { code: 'NOT_AUTHORIZED' } });
    expect(setOrganizationActiveInDatabase).not.toHaveBeenCalled();
  });

  it('no deja eliminar una empresa', async () => {
    const result = await deleteOrganization({ id: SOME_ORGANIZATION_ID });

    expect(result).toEqual({ ok: false, error: { code: 'NOT_AUTHORIZED' } });
    expect(softDeleteOrganization).not.toHaveBeenCalled();
  });

  it('no deja guardar los cambios de una empresa', async () => {
    const result = await updateOrganization(EDIT_INPUT);

    expect(result).toEqual({ ok: false, error: { code: 'NOT_AUTHORIZED' } });
    expect(saveOrganization).not.toHaveBeenCalled();
  });

  it('no deja crear una empresa, ni llega a mirar el catálogo de países', async () => {
    const result = await createOrganization({
      name: 'Distribuidora Central',
      legalName: 'Distribuidora Central, Sociedad Anonima',
      countryCode: 'GT',
      baseCurrencyCode: 'GTQ',
    });

    expect(result).toEqual({ ok: false, error: { code: 'NOT_AUTHORIZED' } });
  });
});

describe('cada acción pide su propio permiso', () => {
  it('apagar una empresa pide el de suspender, no el de editar', async () => {
    await setOrganizationActive({ id: SOME_ORGANIZATION_ID, isActive: false });

    expect(requirePlatformPermission).toHaveBeenCalledWith('platform.organization:suspend');
  });

  it('guardar cambios pide el de editar, no el de crear', async () => {
    await updateOrganization(EDIT_INPUT);

    expect(requirePlatformPermission).toHaveBeenCalledWith('platform.organization:update');
  });

  it('eliminar pide el suyo: poder suspender no da derecho a borrar', async () => {
    await deleteOrganization({ id: SOME_ORGANIZATION_ID });

    expect(requirePlatformPermission).toHaveBeenCalledWith('platform.organization:delete');
  });
});

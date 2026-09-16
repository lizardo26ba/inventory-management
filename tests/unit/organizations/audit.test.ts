/**
 * La bitácora de las acciones de empresas.
 *
 * Lo que se fija aquí es el tramo entre la acción y el repositorio: que el
 * contexto de auditoría se construya con el permiso que de verdad autorizó la
 * operación, y que llegue al repositorio que escribe la entrada. Un permiso
 * equivocado en la bitácora no rompe nada visible y deja una historia falsa.
 *
 * Que la entrada se escriba dentro de la transacción lo garantiza la firma de
 * `recordAuditEntries`, que exige la transacción.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const requirePlatformPermission = vi.fn();
const buildAuditContext = vi.fn();
const setOrganizationActiveInDatabase = vi.fn();
const softDeleteOrganization = vi.fn();

vi.mock('@/modules/auth/session', () => ({
  requirePlatformPermission: (code: string) => requirePlatformPermission(code),
}));

vi.mock('@/modules/auth/scope', () => ({
  scopeOf: () => PLATFORM_SCOPE,
}));

vi.mock('@/modules/audit', () => ({
  buildAuditContext: (...args: readonly unknown[]) => buildAuditContext(...args),
}));

/**
 * El repositorio recibe el alcance de datos como primer argumento. Aquí se aparta
 * para que cada comprobación siga mirando lo que le toca; que el alcance llegue de
 * verdad lo fija su propia prueba.
 */
const scopes: unknown[] = [];

function withoutScope(fn: (...args: readonly unknown[]) => unknown) {
  return (scope: unknown, ...args: readonly unknown[]): unknown => {
    scopes.push(scope);
    return fn(...args);
  };
}

/** El alcance que construye una sesión de super administrador sin empresa elegida. */
const PLATFORM_SCOPE = { organizationId: null, actingAsPlatformAdmin: true };

vi.mock('@/modules/organizations/repository', () => ({
  createOrganization: vi.fn(),
  listCountryOptions: vi.fn(),
  listTakenSlugs: vi.fn(),
  setOrganizationActive: withoutScope((...args) => setOrganizationActiveInDatabase(...args)),
  softDeleteOrganization: withoutScope((...args) => softDeleteOrganization(...args)),
  updateOrganization: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/observability/logger', () => ({
  logger: { failure: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const { deleteOrganization, setOrganizationActive } =
  await import('@/modules/organizations/actions');

const ACTOR_ID = '00000000-0000-4000-8000-0000000000ff';
const ORGANIZATION_ID = '00000000-0000-4000-8000-000000000000';
const SESSION = { userId: ACTOR_ID, organizationId: null, actingAsPlatformAdmin: false };
const AUDIT_CONTEXT = { correlationId: 'correlacion-de-prueba' };

beforeEach(() => {
  vi.clearAllMocks();
  scopes.length = 0;
  requirePlatformPermission.mockResolvedValue(SESSION);
  buildAuditContext.mockResolvedValue(AUDIT_CONTEXT);
  setOrganizationActiveInDatabase.mockResolvedValue(true);
  softDeleteOrganization.mockResolvedValue(true);
});

describe('el contexto de auditoría lleva el permiso ejercido', () => {
  it('el alcance de datos llega al repositorio, delante de todo lo demás', async () => {
    await setOrganizationActive({ id: ORGANIZATION_ID, isActive: false });

    expect(scopes[0]).toEqual(PLATFORM_SCOPE);
  });

  it('suspender deja el permiso de suspender', async () => {
    await setOrganizationActive({ id: ORGANIZATION_ID, isActive: false });

    expect(buildAuditContext).toHaveBeenCalledWith(SESSION, 'platform.organization:suspend');
    expect(setOrganizationActiveInDatabase).toHaveBeenCalledWith(
      ORGANIZATION_ID,
      false,
      ACTOR_ID,
      AUDIT_CONTEXT,
    );
  });

  it('eliminar deja el permiso de eliminar', async () => {
    await deleteOrganization({ id: ORGANIZATION_ID });

    expect(buildAuditContext).toHaveBeenCalledWith(SESSION, 'platform.organization:delete');
    expect(softDeleteOrganization).toHaveBeenCalledWith(
      ORGANIZATION_ID,
      ACTOR_ID,
      AUDIT_CONTEXT,
    );
  });
});

describe('nada silencioso', () => {
  it('si la bitácora no se puede escribir, la operación falla en lugar de seguir sin rastro', async () => {
    softDeleteOrganization.mockRejectedValue(new Error('La bitácora rechazó la escritura.'));

    const result = await deleteOrganization({ id: ORGANIZATION_ID });

    expect(result.ok).toBe(false);
  });
});

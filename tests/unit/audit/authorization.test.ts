/**
 * Prueba negativa de la pantalla de la bitácora.
 *
 * Lo que fija no es que la lista funcione, sino que **no** funcione sin permiso, y
 * que se niegue antes de tocar la base. El orden importa tanto como el resultado:
 * una pantalla que consulta primero y comprueba después ya leyó lo que no debía,
 * aunque termine rechazando.
 *
 * El repositorio va simulado a propósito. Si alguien invierte ese orden, aquí se
 * ve como una consulta que no debía ocurrir.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthorizationError } from '@/lib/errors';

const requirePlatformPermission = vi.fn();
const listPlatformAuditEntries = vi.fn();
const findPlatformAuditEntry = vi.fn();
const listOrganizations = vi.fn();

vi.mock('@/modules/auth/session', () => ({
  requirePlatformPermission: (code: string) => requirePlatformPermission(code),
}));

// Traduce la sesión al alcance que lee la base. Aquí no llega a usarse: la puerta
// rechaza antes. Se simula porque toca el cliente de la base al importarse.
vi.mock('@/modules/auth/scope', () => ({
  scopeOf: () => ({ organizationId: null, actingAsPlatformAdmin: true }),
}));

vi.mock('@/modules/audit', () => ({
  AUDIT_ENTRY_PARAM: 'entry',
  parseAuditListQuery: () => ({ pageSize: 20 }),
  listPlatformAuditEntries: (...args: readonly unknown[]) => listPlatformAuditEntries(...args),
  findPlatformAuditEntry: (...args: readonly unknown[]) => findPlatformAuditEntry(...args),
}));

vi.mock('@/modules/organizations/repository', () => ({
  listOrganizations: (...args: readonly unknown[]) => listOrganizations(...args),
}));

// La vista es de servidor y pinta la página. Aquí estorba: lo que se prueba es la
// puerta, no el dibujo.
vi.mock('@/modules/audit/components/audit-view', () => ({ AuditView: () => null }));

const { default: AuditPage } = await import('@/app/(dashboard)/audit/page');

const NOT_AUTHORIZED = new AuthorizationError('La sesión no es de un super administrador.');

beforeEach(() => {
  vi.clearAllMocks();
  requirePlatformPermission.mockRejectedValue(NOT_AUTHORIZED);
});

describe('la bitácora de plataforma', () => {
  it('pide su propio permiso, no otro de plataforma', async () => {
    await expect(AuditPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      AuthorizationError,
    );

    expect(requirePlatformPermission).toHaveBeenCalledWith('platform.audit:read');
  });

  it('sin permiso no llega a consultar la bitácora ni las empresas', async () => {
    await expect(AuditPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      AuthorizationError,
    );

    expect(listPlatformAuditEntries).not.toHaveBeenCalled();
    expect(listOrganizations).not.toHaveBeenCalled();
  });

  it('sin permiso tampoco abre el detalle que pida la dirección', async () => {
    await expect(
      AuditPage({ searchParams: Promise.resolve({ entry: 'una-entrada' }) }),
    ).rejects.toThrow(AuthorizationError);

    expect(findPlatformAuditEntry).not.toHaveBeenCalled();
  });
});

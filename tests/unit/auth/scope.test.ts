/**
 * De la sesión al alcance de datos.
 *
 * Lo que se fija es la diferencia entre mirar como plataforma y operar dentro de
 * una empresa. Confundirlas es una fuga: un super administrador que entrara en
 * una empresa con la excepción encendida vería las filas de todas. ADR 0013.
 */

import { describe, expect, it, vi } from 'vitest';

import { AuthorizationError } from '@/lib/errors';
import type { SessionContext } from '@/modules/auth/session-context';

vi.mock('server-only', () => ({}));

const { companyScopeOf, platformScopeOf } = await import('@/modules/auth/scope');

function sessionOf(overrides: Partial<SessionContext> = {}): SessionContext {
  return {
    userId: 'u-1',
    email: 'persona@example.test',
    firstName: 'Persona',
    lastName: 'De prueba',
    locale: 'es',
    organizationId: null,
    isPlatformAdmin: false,
    actingAsPlatformAdmin: false,
    twoFactorEnabled: false,
    twoFactorVerifiedAt: null,
    mustChangePassword: false,
    ...overrides,
  };
}

describe('platformScopeOf', () => {
  it('enciende la excepción para un super administrador', () => {
    expect(platformScopeOf(sessionOf({ isPlatformAdmin: true }))).toEqual({
      organizationId: null,
      userId: null,
      actingAsPlatformAdmin: true,
    });
  });

  it('no la enciende para quien no lo es', () => {
    expect(platformScopeOf(sessionOf()).actingAsPlatformAdmin).toBe(false);
  });

  it('no hereda la empresa en la que la sesión estaba trabajando', () => {
    const scope = platformScopeOf(
      sessionOf({
        isPlatformAdmin: true,
        organizationId: 'org-1',
        actingAsPlatformAdmin: true,
      }),
    );

    expect(scope.organizationId).toBeNull();
  });
});

describe('companyScopeOf', () => {
  it('lleva la empresa activa y nada más', () => {
    expect(companyScopeOf(sessionOf({ organizationId: 'org-1' }))).toEqual({
      organizationId: 'org-1',
      userId: null,
      actingAsPlatformAdmin: false,
    });
  });

  it('apaga la excepción también para un super administrador dentro de una empresa', () => {
    const scope = companyScopeOf(
      sessionOf({
        isPlatformAdmin: true,
        organizationId: 'org-1',
        actingAsPlatformAdmin: true,
      }),
    );

    expect(scope.actingAsPlatformAdmin).toBe(false);
  });

  it('se niega sin empresa activa', () => {
    expect(() => companyScopeOf(sessionOf())).toThrow(AuthorizationError);
  });
});

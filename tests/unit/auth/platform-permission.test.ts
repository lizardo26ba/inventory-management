/**
 * La puerta del super administrador, contestada sin lanzar.
 *
 * `holdsPlatformPermission` decide qué secciones enseña el menú. Si contestara
 * distinto de lo que luego hace `requirePlatformAdmin`, el producto mentiría en
 * una de las dos direcciones: ofreciendo lo que se va a rechazar, o escondiendo
 * lo que sí estaba permitido. Por eso las dos salen del mismo veredicto, y estas
 * pruebas fijan ese veredicto.
 *
 * Lo que más importa aquí son los casos negativos. Que conteste que sí a un
 * super administrador es lo fácil; lo que hay que sostener en el tiempo es que
 * conteste que no sin el privilegio, y que no baste con tenerlo cuando el
 * segundo factor está exigido y sin superar. RN-005, ADR 0005.
 */

import { describe, expect, it, vi } from 'vitest';

import type { SessionContext } from '@/modules/auth/session-context';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/config/env.server', () => ({
  get isProduction(): boolean {
    return false;
  },
}));

// Nada de esto se toca: la comprobación recibe la sesión ya leída y no vuelve a
// la base ni a la petición. Se anulan porque el módulo los importa, no porque
// participen.
vi.mock('next/headers', () => ({ cookies: vi.fn(), headers: vi.fn() }));
vi.mock('@/modules/auth/repository', () => ({
  deleteSession: vi.fn(),
  findSessionByHash: vi.fn(),
}));
vi.mock('@/modules/auth/service', () => ({
  hashSessionToken: vi.fn(),
  isSessionExpired: vi.fn(),
  SESSION_LIFETIME_MS: 0,
}));

const { holdsPlatformPermission } = await import('@/modules/auth/session');

const VERIFIED_AT = new Date('2026-09-14T10:00:00.000Z');

function sessionOf(overrides: Partial<SessionContext>): SessionContext {
  return {
    userId: '00000000-0000-4000-8000-000000000000',
    email: 'ana.morales@example.test',
    firstName: 'Ana',
    lastName: 'Morales',
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

describe('la puerta del super administrador', () => {
  it('concede al super administrador que ya lo superó', () => {
    const session = sessionOf({ isPlatformAdmin: true, twoFactorVerifiedAt: VERIFIED_AT });

    expect(holdsPlatformPermission(session, 'platform.user:read')).toBe(true);
    expect(holdsPlatformPermission(session, 'platform.organization:read')).toBe(true);
  });

  it('niega a quien no es super administrador, aunque haya entrado bien', () => {
    const session = sessionOf({ isPlatformAdmin: false, twoFactorVerifiedAt: VERIFIED_AT });

    expect(holdsPlatformPermission(session, 'platform.user:read')).toBe(false);
  });

  it('niega al super administrador que todavía no lo superó', () => {
    const session = sessionOf({ isPlatformAdmin: true, twoFactorVerifiedAt: null });

    expect(holdsPlatformPermission(session, 'platform.user:read')).toBe(false);
  });
});

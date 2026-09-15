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

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type SessionContext } from '@/modules/auth/session-context';

/**
 * Si el segundo factor se exige es configuración, y la configuración se lee una
 * sola vez al cargar el módulo. El captador deja cambiarla entre pruebas sin
 * volver a importar nada.
 */
let twoFactorRequired = true;

vi.mock('server-only', () => ({}));

vi.mock('@/lib/config/env.server', () => ({
  get isProduction(): boolean {
    return false;
  },
  get requiresPlatformAdminTwoFactor(): boolean {
    return twoFactorRequired;
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
    twoFactorVerifiedAt: null,
    mustChangePassword: false,
    ...overrides,
  };
}

beforeEach(() => {
  twoFactorRequired = true;
});

describe('con el segundo factor exigido', () => {
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

/**
 * La suspensión declarada de RN-005. Mientras las pantallas del segundo factor
 * no existan, la variable lo apaga y el privilegio basta por sí solo. Se prueba
 * porque es el estado en el que el sistema corre hoy, no a pesar de ser
 * temporal. Ver la enmienda del ADR 0005.
 */
describe('con el segundo factor apagado', () => {
  beforeEach(() => {
    twoFactorRequired = false;
  });

  it('concede al super administrador que no lo ha superado', () => {
    const session = sessionOf({ isPlatformAdmin: true, twoFactorVerifiedAt: null });

    expect(holdsPlatformPermission(session, 'platform.user:read')).toBe(true);
  });

  it('sigue negando a quien no es super administrador', () => {
    const session = sessionOf({ isPlatformAdmin: false, twoFactorVerifiedAt: null });

    expect(holdsPlatformPermission(session, 'platform.user:read')).toBe(false);
  });
});

/**
 * Pedir un permiso de empresa por la puerta de la plataforma no es un rechazo:
 * es un error de programación, y contestar `false` lo escondería como si fuera
 * una falta de privilegio.
 */
describe('permiso mal pedido', () => {
  it('lanza en lugar de contestar que no', () => {
    const session = sessionOf({ isPlatformAdmin: true, twoFactorVerifiedAt: VERIFIED_AT });

    expect(() => holdsPlatformPermission(session, 'product:read' as never)).toThrowError(
      /no es de alcance de plataforma/,
    );
  });
});

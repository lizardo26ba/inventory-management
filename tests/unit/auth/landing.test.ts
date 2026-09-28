/**
 * A dónde va cada persona al entrar.
 *
 * Se prueba aquí y no a través de la pantalla porque es una decisión pura: dado
 * lo que la sesión sabe, qué corresponde. Una prueba de extremo a extremo diría
 * lo mismo tardando mil veces más y fallaría por motivos ajenos.
 */

import { describe, expect, it } from 'vitest';

import { resolveLanding } from '@/modules/auth/landing';
import type { SessionContext } from '@/modules/auth/session-context';

const VERIFIED = new Date('2026-09-27T12:00:00Z');

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

describe('resolveLanding', () => {
  it('manda a cambiar la contraseña antes que a ningún otro sitio', () => {
    const session = sessionOf({
      mustChangePassword: true,
      isPlatformAdmin: true,
      organizationId: 'org-1',
    });

    // Aunque tenga empresa activa y sea super administrador: mientras arrastre
    // una contraseña que conoce alguien más, no pasa de ahí. Ni siquiera al
    // segundo factor, que se da de alta con una contraseña solo suya.
    expect(resolveLanding(session)).toEqual({ kind: 'changePassword' });
  });

  it('con empresa activa, va a la operación de esa empresa', () => {
    const session = sessionOf({
      organizationId: 'org-1',
      isPlatformAdmin: true,
      twoFactorVerifiedAt: VERIFIED,
    });

    expect(resolveLanding(session)).toEqual({
      kind: 'company',
      organizationId: 'org-1',
    });
  });

  it('un super administrador sin empresa activa va a la lista de empresas', () => {
    const session = sessionOf({ isPlatformAdmin: true, twoFactorVerifiedAt: VERIFIED });

    expect(resolveLanding(session)).toEqual({ kind: 'organizations' });
  });

  it('un miembro sin empresa activa va a elegir en cuál trabajar', () => {
    expect(resolveLanding(sessionOf())).toEqual({ kind: 'chooseCompany' });
  });
});

describe('resolveLanding con el segundo factor', () => {
  it('un super administrador sin factor activo va a activarlo', () => {
    const session = sessionOf({ isPlatformAdmin: true });

    expect(resolveLanding(session)).toEqual({ kind: 'twoFactorSetup' });
  });

  it('con factor activo pero sin superar en esta sesión, va a escribir el código', () => {
    const session = sessionOf({ isPlatformAdmin: true, twoFactorEnabled: true });

    expect(resolveLanding(session)).toEqual({ kind: 'twoFactorVerify' });
  });

  it('ni con empresa activa se salta el código', () => {
    const session = sessionOf({
      isPlatformAdmin: true,
      twoFactorEnabled: true,
      organizationId: 'org-1',
      actingAsPlatformAdmin: true,
    });

    expect(resolveLanding(session)).toEqual({ kind: 'twoFactorVerify' });
  });

  it('a un miembro nunca se le pide, aunque tenga un factor de antes', () => {
    const session = sessionOf({ twoFactorEnabled: true });

    expect(resolveLanding(session)).toEqual({ kind: 'chooseCompany' });
  });
});

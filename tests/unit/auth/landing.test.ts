/**
 * A dónde va cada persona al entrar.
 *
 * Se prueba aquí y no a través de la pantalla porque es una decisión pura: dado
 * lo que la sesión sabe, qué corresponde. Una prueba de extremo a extremo diría
 * lo mismo tardando mil veces más y fallaría por motivos ajenos.
 */

import { describe, expect, it } from 'vitest';

import { resolveLanding } from '@/modules/auth/landing';
import { type SessionContext } from '@/modules/auth/session-context';

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
    // una contraseña que conoce alguien más, no pasa de ahí.
    expect(resolveLanding(session)).toEqual({ kind: 'changePassword' });
  });

  it('con empresa activa, va a la operación de esa empresa', () => {
    const session = sessionOf({ organizationId: 'org-1', isPlatformAdmin: true });

    expect(resolveLanding(session)).toEqual({ kind: 'company', organizationId: 'org-1' });
  });

  it('un super administrador sin empresa activa va a la lista de empresas', () => {
    expect(resolveLanding(sessionOf({ isPlatformAdmin: true }))).toEqual({
      kind: 'organizations',
    });
  });

  it('quien no alcanza ninguna empresa lo sabe, en lugar de ver una pantalla vacía', () => {
    expect(resolveLanding(sessionOf())).toEqual({ kind: 'noAccess' });
  });
});

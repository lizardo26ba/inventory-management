/**
 * Quién puede trabajar dentro de una empresa. ADR 0013.
 *
 * Aquí se fija la decisión pura. Lo que la rodea, leer la sesión y la base, se
 * prueba en `company-gates.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import type { PermissionCode } from '@/lib/auth/permissions';
import { everyOrganizationPermission, judgeMemberAccess } from '@/modules/auth/company-access';

const WITHOUT_TWO_FACTOR = { twoFactorVerifiedAt: null };
const WITH_TWO_FACTOR = { twoFactorVerifiedAt: new Date('2026-09-27T12:00:00Z') };

function permissions(...codes: PermissionCode[]): ReadonlySet<PermissionCode> {
  return new Set(codes);
}

describe('judgeMemberAccess', () => {
  it('deja trabajar a un miembro que no administra, con o sin segundo factor', () => {
    expect(judgeMemberAccess(WITHOUT_TWO_FACTOR, permissions('product:read'), true)).toBe(
      'GRANTED',
    );
  });

  it('pide el segundo factor a quien puede decidir quién entra', () => {
    for (const code of ['user:update', 'role:update'] as const) {
      expect(judgeMemberAccess(WITHOUT_TWO_FACTOR, permissions(code), true)).toBe(
        'TWO_FACTOR_MISSING',
      );
    }
  });

  it('no lo pide cuando ya está superado', () => {
    expect(judgeMemberAccess(WITH_TWO_FACTOR, permissions('user:update'), true)).toBe(
      'GRANTED',
    );
  });

  it('no lo pide mientras la configuración lo suspende, como al super administrador', () => {
    expect(judgeMemberAccess(WITHOUT_TWO_FACTOR, permissions('role:update'), false)).toBe(
      'GRANTED',
    );
  });
});

describe('everyOrganizationPermission', () => {
  it('trae todos los permisos de empresa y ninguno de plataforma', () => {
    const codes = [...everyOrganizationPermission()];

    expect(codes).toContain('product:read');
    expect(codes).toContain('user:update');
    expect(codes.some((code) => code.startsWith('platform.'))).toBe(false);
  });
});

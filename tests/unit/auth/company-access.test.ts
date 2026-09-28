/**
 * Lo que alcanza dentro de una empresa quien entra como plataforma. ADR 0013.
 *
 * Aquí se fija la decisión pura. Lo que la rodea, leer la sesión y la base, se
 * prueba en `company-gates.test.ts`.
 */

import { describe, expect, it } from 'vitest';

import { everyOrganizationPermission } from '@/modules/auth/company-access';

describe('everyOrganizationPermission', () => {
  it('trae todos los permisos de empresa y ninguno de plataforma', () => {
    const codes = [...everyOrganizationPermission()];

    expect(codes).toContain('product:read');
    expect(codes).toContain('user:update');
    expect(codes.some((code) => code.startsWith('platform.'))).toBe(false);
  });
});

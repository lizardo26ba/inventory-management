/**
 * Pruebas de la lógica del dominio de usuarios que no toca la base.
 *
 * Dos cosas que conviene que no se rompan sin que nadie se entere: que la
 * contraseña temporal cumpla la política y no traiga caracteres que se confunden
 * al dictarla, y que el cálculo de cambios de acceso no borre lo que solo cambia
 * de rol.
 */

import { describe, expect, it } from 'vitest';

import { MINIMUM_PASSWORD_LENGTH } from '@/modules/auth/schema';
import { diffAccesses, generateTemporaryPassword } from '@/modules/users/service';

const ORGANIZATION_A = '00000000-0000-4000-8000-00000000000a';
const ORGANIZATION_B = '00000000-0000-4000-8000-00000000000b';
const ROLE_ONE = '00000000-0000-4000-8000-000000000001';
const ROLE_TWO = '00000000-0000-4000-8000-000000000002';

describe('contraseña temporal', () => {
  it('cumple el mínimo de la política sin contar los separadores', () => {
    const password = generateTemporaryPassword();

    expect(password.replaceAll('-', '').length).toBeGreaterThanOrEqual(MINIMUM_PASSWORD_LENGTH);
  });

  it('no trae caracteres que se confunden al leerla en voz alta', () => {
    const password = generateTemporaryPassword();

    // La O y el cero, la ele y el uno, la i mayúscula.
    expect(password).not.toMatch(/[O0l1I]/);
  });

  it('no repite la misma contraseña dos veces seguidas', () => {
    const passwords = new Set(Array.from({ length: 20 }, () => generateTemporaryPassword()));

    expect(passwords.size).toBe(20);
  });
});

describe('cambios de acceso', () => {
  it('concede lo que no estaba', () => {
    const changes = diffAccesses([], [{ organizationId: ORGANIZATION_A, roleId: ROLE_ONE }]);

    expect(changes.granted).toEqual([{ organizationId: ORGANIZATION_A, roleId: ROLE_ONE }]);
    expect(changes.revokedOrganizationIds).toEqual([]);
    expect(changes.roleChanged).toEqual([]);
  });

  it('revoca lo que dejó de estar', () => {
    const changes = diffAccesses([{ organizationId: ORGANIZATION_A, roleId: ROLE_ONE }], []);

    expect(changes.revokedOrganizationIds).toEqual([ORGANIZATION_A]);
    expect(changes.granted).toEqual([]);
  });

  it('cambiar de rol no revoca el acceso: la membresía sigue siendo la misma', () => {
    const changes = diffAccesses(
      [{ organizationId: ORGANIZATION_A, roleId: ROLE_ONE }],
      [{ organizationId: ORGANIZATION_A, roleId: ROLE_TWO }],
    );

    expect(changes.roleChanged).toEqual([{ organizationId: ORGANIZATION_A, roleId: ROLE_TWO }]);
    expect(changes.revokedOrganizationIds).toEqual([]);
    expect(changes.granted).toEqual([]);
  });

  it('lo que no cambia no aparece en ninguna lista', () => {
    const same = [{ organizationId: ORGANIZATION_A, roleId: ROLE_ONE }];
    const changes = diffAccesses(same, same);

    expect(changes).toEqual({ granted: [], revokedOrganizationIds: [], roleChanged: [] });
  });

  it('distingue empresas distintas en la misma operación', () => {
    const changes = diffAccesses(
      [{ organizationId: ORGANIZATION_A, roleId: ROLE_ONE }],
      [{ organizationId: ORGANIZATION_B, roleId: ROLE_TWO }],
    );

    expect(changes.granted).toEqual([{ organizationId: ORGANIZATION_B, roleId: ROLE_TWO }]);
    expect(changes.revokedOrganizationIds).toEqual([ORGANIZATION_A]);
  });
});

/**
 * Que los esquemas de formularios y acciones rechacen un campo de más.
 *
 * Principio 2 de CLAUDE.md. Un esquema que descarta en silencio lo que no conoce
 * deja pasar la petición: un `isPlatformAdmin` colado en otra acción no haría
 * nada hoy, pero el día que esa acción lo lea, ya estaba aceptado. Rechazarlo
 * deja ver el intento.
 *
 * Cada caso parte de una entrada válida, para que el rechazo se deba solo al
 * campo añadido.
 */

import { describe, expect, it } from 'vitest';
import type { z } from 'zod';

import {
  changePasswordSchema,
  enterCompanySchema,
  signInSchema,
  twoFactorCodeSchema,
} from '@/modules/auth/schema';
import {
  createOrganizationSchema,
  organizationIdSchema,
  setOrganizationActiveSchema,
  updateOrganizationSchema,
} from '@/modules/organizations/schema';
import {
  createUserSchema,
  resetTwoFactorSchema,
  setUserActiveSchema,
  updateUserSchema,
  userIdSchema,
} from '@/modules/users/schema';
import {
  createWarehouseSchema,
  setWarehouseActiveSchema,
  updateWarehouseSchema,
} from '@/modules/warehouses/schema';

const ID = '0199a0b0-0000-7000-8000-000000000001';
const OTHER_ID = '0199a0b0-0000-7000-8000-000000000002';

const organization = {
  name: 'Distribuidora Central',
  legalName: 'Distribuidora Central, S.A.',
  countryCode: 'GT',
  baseCurrencyCode: 'GTQ',
};

const user = {
  firstName: 'Ana',
  lastName: 'Morales',
  email: 'ana@example.test',
  countryCode: 'GT',
  accesses: [{ organizationId: ID, roleId: OTHER_ID }],
};

const { baseCurrencyCode: _currency, ...editableOrganization } = organization;

const warehouse = {
  code: 'MAIN',
  name: 'Bodega central',
  countryCode: 'GT',
  timeZone: 'America/Guatemala',
};

const { code: _code, ...editableWarehouse } = warehouse;

const CASES: readonly (readonly [string, z.ZodType, Record<string, unknown>])[] = [
  ['entrar', signInSchema, { email: 'ana@example.test', password: 'x' }],
  [
    'cambiar la contraseña',
    changePasswordSchema,
    {
      currentPassword: 'la-de-antes-123',
      newPassword: 'la-nueva-de-doce',
      confirmPassword: 'la-nueva-de-doce',
    },
  ],
  ['entrar en una empresa', enterCompanySchema, { organizationId: ID }],
  ['el código del segundo factor', twoFactorCodeSchema, { code: '123456' }],
  ['alta de empresa', createOrganizationSchema, organization],
  [
    'edición de empresa',
    updateOrganizationSchema,
    { ...editableOrganization, id: ID, version: 0 },
  ],
  ['una empresa por su identificador', organizationIdSchema, { id: ID }],
  ['estado de una empresa', setOrganizationActiveSchema, { id: ID, isActive: true }],
  ['alta de usuario', createUserSchema, user],
  ['edición de usuario', updateUserSchema, { ...user, id: ID, version: 0 }],
  ['un usuario por su identificador', userIdSchema, { id: ID }],
  ['estado de un usuario', setUserActiveSchema, { id: ID, isActive: true }],
  ['restablecer el segundo factor', resetTwoFactorSchema, { id: ID }],
  ['alta de almacén', createWarehouseSchema, warehouse],
  ['edición de almacén', updateWarehouseSchema, { ...editableWarehouse, id: ID, version: 0 }],
  ['estado de un almacén', setWarehouseActiveSchema, { id: ID, isActive: false }],
];

describe.each(CASES)('%s', (_name, schema, valid) => {
  it('acepta la entrada tal como la manda el formulario', () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it('rechaza un campo que no conoce', () => {
    expect(schema.safeParse({ ...valid, extra: 1 }).success).toBe(false);
  });
});

it('un acceso con un campo de más invalida el alta entera', () => {
  const tampered = {
    ...user,
    accesses: [{ organizationId: ID, roleId: OTHER_ID, admin: true }],
  };

  expect(createUserSchema.safeParse(tampered).success).toBe(false);
});

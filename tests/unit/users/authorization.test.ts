/**
 * Pruebas negativas de autorización del dominio de usuarios.
 *
 * Lo que fijan no es que la acción funcione, sino que **no** funcione sin
 * permiso, y que se niegue antes de tocar la base. El orden importa tanto como el
 * resultado: una acción que consulta primero y comprueba después ya filtró
 * información aunque termine rechazando.
 *
 * Interesa especialmente el alta: sin permiso no debe llegar a preguntar si un
 * correo ya existe, porque esa respuesta ya dice quién tiene cuenta.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthorizationError } from '@/lib/errors';

const requirePlatformPermission = vi.fn();
const hashPassword = vi.fn();
const checkEmail = vi.fn();
const insertUser = vi.fn();
const saveUser = vi.fn();
const updateUserActive = vi.fn();
const removeUser = vi.fn();
const listOrganizationChoices = vi.fn();

vi.mock('@/modules/auth', () => ({
  requirePlatformPermission: (code: string) => requirePlatformPermission(code),
  hashPassword: (plain: string) => hashPassword(plain),
}));

vi.mock('@/modules/users/repository', () => ({
  checkEmail: (...args: readonly unknown[]) => checkEmail(...args),
  createUser: (...args: readonly unknown[]) => insertUser(...args),
  listOrganizationChoices: () => listOrganizationChoices(),
  setUserActive: (...args: readonly unknown[]) => updateUserActive(...args),
  softDeleteUser: (...args: readonly unknown[]) => removeUser(...args),
  updateUser: (...args: readonly unknown[]) => saveUser(...args),
}));

// El registro escribe el fallo por consola. Aquí estorba: el rechazo es el
// resultado esperado, no un incidente.
vi.mock('@/lib/observability/logger', () => ({
  logger: { failure: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const { createUser, deleteUser, setUserActive, updateUser } =
  await import('@/modules/users/actions');

const SOME_USER_ID = '00000000-0000-4000-8000-000000000000';

/** Lo mínimo que el esquema acepta, para que el rechazo venga del permiso. */
const NEW_USER = {
  firstName: 'Ana',
  lastName: 'Morales',
  email: 'ana.morales@example.test',
  countryCode: 'GT',
  accesses: [],
};

const EDITED_USER = { ...NEW_USER, id: SOME_USER_ID, version: 2 };

beforeEach(() => {
  vi.clearAllMocks();
  requirePlatformPermission.mockRejectedValue(
    new AuthorizationError('La sesión no es de un super administrador.'),
  );
});

describe('sin permiso de plataforma', () => {
  it('no deja crear una cuenta, ni llega a mirar si el correo existe', async () => {
    const result = await createUser(NEW_USER);

    expect(result).toEqual({ ok: false, error: { code: 'NOT_AUTHORIZED' } });
    expect(checkEmail).not.toHaveBeenCalled();
    expect(insertUser).not.toHaveBeenCalled();
    expect(hashPassword).not.toHaveBeenCalled();
  });

  it('no deja guardar los cambios de una cuenta', async () => {
    const result = await updateUser(EDITED_USER);

    expect(result).toEqual({ ok: false, error: { code: 'NOT_AUTHORIZED' } });
    expect(saveUser).not.toHaveBeenCalled();
  });

  it('no deja suspender ni reactivar', async () => {
    const result = await setUserActive({ id: SOME_USER_ID, isActive: false });

    expect(result).toEqual({ ok: false, error: { code: 'NOT_AUTHORIZED' } });
    expect(updateUserActive).not.toHaveBeenCalled();
  });

  it('no deja eliminar', async () => {
    const result = await deleteUser({ id: SOME_USER_ID });

    expect(result).toEqual({ ok: false, error: { code: 'NOT_AUTHORIZED' } });
    expect(removeUser).not.toHaveBeenCalled();
  });
});

describe('cada acción pide su propio permiso', () => {
  it('crear pide el de crear', async () => {
    await createUser(NEW_USER);

    expect(requirePlatformPermission).toHaveBeenCalledWith('platform.user:create');
  });

  it('guardar cambios pide el de editar, no el de crear', async () => {
    await updateUser(EDITED_USER);

    expect(requirePlatformPermission).toHaveBeenCalledWith('platform.user:update');
  });

  it('suspender pide el de suspender, no el de editar', async () => {
    await setUserActive({ id: SOME_USER_ID, isActive: false });

    expect(requirePlatformPermission).toHaveBeenCalledWith('platform.user:suspend');
  });

  it('eliminar pide el suyo: poder suspender no da derecho a borrar', async () => {
    await deleteUser({ id: SOME_USER_ID });

    expect(requirePlatformPermission).toHaveBeenCalledWith('platform.user:delete');
  });
});

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
const findUser = vi.fn();

vi.mock('@/modules/auth', () => ({
  requirePlatformPermission: (code: string) => requirePlatformPermission(code),
  hashPassword: (plain: string) => hashPassword(plain),
}));

vi.mock('@/modules/users/repository', () => ({
  checkEmail: (...args: readonly unknown[]) => checkEmail(...args),
  createUser: (...args: readonly unknown[]) => insertUser(...args),
  findUserById: (...args: readonly unknown[]) => findUser(...args),
  listOrganizationChoices: () => listOrganizationChoices(),
  setUserActive: (...args: readonly unknown[]) => updateUserActive(...args),
  softDeleteUser: (...args: readonly unknown[]) => removeUser(...args),
  updateUser: (...args: readonly unknown[]) => saveUser(...args),
}));

// Navegar y revalidar son cosa del marco. Aquí se anulan: esta prueba mira la
// autorización, y el redirect de Next funciona lanzando.
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

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

/**
 * El acceso de plataforma es una capacidad aparte.
 *
 * Poder crear cuentas no da derecho a repartir el privilegio que alcanza a todas
 * las empresas, y poder editar no da derecho a retirarlo. ADR 0005.
 */
describe('acceso de plataforma', () => {
  const ACTING_USER_ID = '00000000-0000-4000-8000-0000000000ff';

  function allowExcept(deniedCode: string): void {
    requirePlatformPermission.mockImplementation((code: string) => {
      if (code === deniedCode) {
        return Promise.reject(new AuthorizationError('Sin permiso para eso.'));
      }
      return Promise.resolve({ userId: ACTING_USER_ID });
    });
  }

  it('crear con el interruptor encendido pide además el permiso de conceder', async () => {
    requirePlatformPermission.mockResolvedValue({ userId: ACTING_USER_ID });
    checkEmail.mockResolvedValue('FREE');
    listOrganizationChoices.mockResolvedValue([]);
    hashPassword.mockResolvedValue('huella');

    await createUser({ ...NEW_USER, isPlatformAdmin: true, platformAdminReason: 'Soporte.' });

    expect(requirePlatformPermission).toHaveBeenCalledWith('platform.user:create');
    expect(requirePlatformPermission).toHaveBeenCalledWith('platform.admin:grant');
  });

  it('sin el permiso de conceder no se crea la cuenta', async () => {
    allowExcept('platform.admin:grant');
    checkEmail.mockResolvedValue('FREE');

    const result = await createUser({
      ...NEW_USER,
      isPlatformAdmin: true,
      platformAdminReason: 'Soporte.',
    });

    expect(result).toEqual({ ok: false, error: { code: 'NOT_AUTHORIZED' } });
    expect(insertUser).not.toHaveBeenCalled();
  });

  it('conceder sin motivo no pasa la frontera', async () => {
    requirePlatformPermission.mockResolvedValue({ userId: ACTING_USER_ID });

    const result = await createUser({ ...NEW_USER, isPlatformAdmin: true });

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_FAILED',
        fieldErrors: { platformAdminReason: 'required' },
      },
    });
    expect(insertUser).not.toHaveBeenCalled();
  });

  it('retirarlo al editar pide el permiso de revocar', async () => {
    allowExcept('platform.admin:revoke');
    findUser.mockResolvedValue({ id: SOME_USER_ID, isPlatformAdmin: true });

    const result = await updateUser(EDITED_USER);

    expect(requirePlatformPermission).toHaveBeenCalledWith('platform.admin:revoke');
    expect(result).toEqual({ ok: false, error: { code: 'NOT_AUTHORIZED' } });
    expect(saveUser).not.toHaveBeenCalled();
  });

  it('guardar sin tocar el privilegio no pide ni conceder ni revocar', async () => {
    requirePlatformPermission.mockResolvedValue({ userId: ACTING_USER_ID });
    findUser.mockResolvedValue({ id: SOME_USER_ID, isPlatformAdmin: false });
    checkEmail.mockResolvedValue('FREE');
    saveUser.mockResolvedValue({ outcome: 'UPDATED' });

    await updateUser(EDITED_USER);

    expect(requirePlatformPermission).not.toHaveBeenCalledWith('platform.admin:grant');
    expect(requirePlatformPermission).not.toHaveBeenCalledWith('platform.admin:revoke');
  });

  it('nadie se lo quita a sí mismo: la plataforma se quedaría sin quien la administre', async () => {
    requirePlatformPermission.mockResolvedValue({ userId: SOME_USER_ID });
    findUser.mockResolvedValue({ id: SOME_USER_ID, isPlatformAdmin: true });

    const result = await updateUser(EDITED_USER);

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'VALIDATION_FAILED',
        fieldErrors: { isPlatformAdmin: 'cannotRevokeOwnPlatformAccess' },
      },
    });
    expect(saveUser).not.toHaveBeenCalled();
  });
});

/**
 * El sello de autoría llega hasta la escritura.
 *
 * Que la columna sea obligatoria lo defiende la base. Lo que estas pruebas
 * defienden es lo otro: que el valor que llega no es cualquiera, sino la persona
 * de la sesión. Una acción que escribiera el identificador equivocado pasaría
 * todas las restricciones de la base y dejaría una autoría falsa, que es peor
 * que no tener ninguna.
 *
 * Se mira el actor en las cuatro operaciones que tocan una cuenta, incluidas
 * suspender y borrar: esas también son tocar la fila, y el último autor tiene
 * que cambiar cuando alguien las ejecuta.
 *
 * Lo mismo vale para la bitácora: el contexto de auditoría tiene que salir de la
 * sesión y del permiso que autorizó la operación, no de otro.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const requirePlatformPermission = vi.fn();
const hashPassword = vi.fn();
const buildAuditContext = vi.fn();
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

vi.mock('@/modules/audit', () => ({
  buildAuditContext: (...args: readonly unknown[]) => buildAuditContext(...args),
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

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/observability/logger', () => ({
  logger: { failure: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const { createUser, deleteUser, setUserActive, updateUser } =
  await import('@/modules/users/actions');

/** Quien opera. Es el valor que tiene que acabar escrito en la fila. */
const ACTOR_ID = '00000000-0000-4000-8000-0000000000ff';
/** La cuenta sobre la que se opera. Nunca debe confundirse con la anterior. */
const TARGET_ID = '00000000-0000-4000-8000-000000000000';

/** Lo que devuelve la construcción del contexto. Tiene que llegar tal cual. */
const AUDIT_CONTEXT = { correlationId: 'correlacion-de-prueba' };

const NEW_USER = {
  firstName: 'Ana',
  lastName: 'Morales',
  email: 'ana.morales@example.test',
  countryCode: 'GT',
  accesses: [],
};

const EDITED_USER = { ...NEW_USER, id: TARGET_ID, version: 2 };

beforeEach(() => {
  vi.clearAllMocks();
  requirePlatformPermission.mockResolvedValue({ userId: ACTOR_ID });
  buildAuditContext.mockResolvedValue(AUDIT_CONTEXT);
  checkEmail.mockResolvedValue('FREE');
  listOrganizationChoices.mockResolvedValue([]);
  hashPassword.mockResolvedValue('huella');
  findUser.mockResolvedValue({ id: TARGET_ID, isPlatformAdmin: false });
  saveUser.mockResolvedValue({ outcome: 'UPDATED' });
  updateUserActive.mockResolvedValue(true);
  removeUser.mockResolvedValue(true);
});

describe('el autor que se escribe es el de la sesión', () => {
  it('al crear una cuenta', async () => {
    await createUser(NEW_USER);

    expect(insertUser).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: ACTOR_ID }),
      AUDIT_CONTEXT,
    );
  });

  it('al guardar los cambios de una cuenta', async () => {
    await updateUser(EDITED_USER);

    expect(saveUser).toHaveBeenCalledWith(
      TARGET_ID,
      2,
      expect.objectContaining({ actorId: ACTOR_ID }),
      AUDIT_CONTEXT,
    );
  });

  it('al suspender, que también es tocar la fila', async () => {
    await setUserActive({ id: TARGET_ID, isActive: false });

    expect(updateUserActive).toHaveBeenCalledWith(TARGET_ID, false, ACTOR_ID, AUDIT_CONTEXT);
  });

  it('al borrar, que deja constancia de quién borró', async () => {
    await deleteUser({ id: TARGET_ID });

    expect(removeUser).toHaveBeenCalledWith(TARGET_ID, ACTOR_ID, AUDIT_CONTEXT);
  });
});

/**
 * El error que esta prueba existe para impedir: escribir como autor a la persona
 * sobre la que se opera en lugar de a quien opera. Las dos son identificadores
 * de usuario y encajan igual en la columna, así que ni los tipos ni la clave
 * foránea lo notarían.
 */
describe('no se confunde a quien opera con la cuenta operada', () => {
  it('el autor de una edición no es la cuenta editada', async () => {
    await updateUser(EDITED_USER);

    const [, , data] = saveUser.mock.calls[0] as [string, number, { readonly actorId: string }];

    expect(data.actorId).toBe(ACTOR_ID);
    expect(data.actorId).not.toBe(TARGET_ID);
  });

  it('el autor de un borrado no es la cuenta borrada', async () => {
    await deleteUser({ id: TARGET_ID });

    const [id, actorId] = removeUser.mock.calls[0] as [string, string];

    expect(id).toBe(TARGET_ID);
    expect(actorId).toBe(ACTOR_ID);
  });
});

describe('la bitácora recibe la sesión y el permiso que autorizó la operación', () => {
  const SESSION = expect.objectContaining({ userId: ACTOR_ID });

  it('crear deja el permiso de crear', async () => {
    await createUser(NEW_USER);

    expect(buildAuditContext).toHaveBeenCalledWith(SESSION, 'platform.user:create');
  });

  it('guardar deja el permiso de editar', async () => {
    await updateUser(EDITED_USER);

    expect(buildAuditContext).toHaveBeenCalledWith(SESSION, 'platform.user:update');
  });

  it('suspender deja el permiso de suspender', async () => {
    await setUserActive({ id: TARGET_ID, isActive: false });

    expect(buildAuditContext).toHaveBeenCalledWith(SESSION, 'platform.user:suspend');
  });

  it('borrar deja el permiso de borrar', async () => {
    await deleteUser({ id: TARGET_ID });

    expect(buildAuditContext).toHaveBeenCalledWith(SESSION, 'platform.user:delete');
  });

  it('la contraseña temporal no viaja al contexto de auditoría', async () => {
    const result = await createUser(NEW_USER);

    expect(result.ok).toBe(true);
    const temporaryPassword = result.ok ? result.temporaryPassword : '';
    expect(JSON.stringify(buildAuditContext.mock.calls)).not.toContain(temporaryPassword);
  });
});

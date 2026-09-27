/**
 * Lo que la base impide del segundo factor. ADR 0014.
 *
 * Una cuenta pasa por tres estados: sin alta, pendiente de confirmar y activa.
 * Las restricciones de la migración `20260927220000_segundo_factor_del_super_administrador`
 * rechazan cualquier otra combinación, y solo una base real lo puede comprobar.
 */

import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/db/client';

const CHECK_VIOLATION = /violates check constraint/;

/** El secreto no se lee aquí: basta con que haya algo en la columna. */
const SOME_SECRET = 'v1:cifrado-de-prueba';
const SOME_STEP = 59_000_000n;

type TwoFactorState = {
  readonly secret: string | null;
  readonly enabledAt: Date | null;
  readonly lastUsedStep: bigint | null;
};

async function insertUser(state: TwoFactorState): Promise<void> {
  const id = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO users (id, email, password_hash, first_name, last_name, status, locale,
      must_change_password, failed_login_attempts, version, created_by_id, updated_by_id,
      created_at, updated_at, two_factor_secret, two_factor_enabled_at,
      two_factor_last_used_step)
    VALUES (${id}, ${`segundo-factor-${id}@example.test`}, 'sin-uso', 'Segundo', 'Factor',
      'ACTIVE', 'es', false, 0, 0, ${id}, ${id}, now(), now(), ${state.secret},
      ${state.enabledAt}, ${state.lastUsedStep})
  `;
}

describe('estados del segundo factor', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('acepta una cuenta sin alta, una pendiente y una activa', async () => {
    await insertUser({ secret: null, enabledAt: null, lastUsedStep: null });
    await insertUser({ secret: SOME_SECRET, enabledAt: null, lastUsedStep: null });
    await insertUser({ secret: SOME_SECRET, enabledAt: new Date(), lastUsedStep: SOME_STEP });
  });

  it('rechaza una cuenta activa sin secreto', async () => {
    await expect(
      insertUser({ secret: null, enabledAt: new Date(), lastUsedStep: null }),
    ).rejects.toThrow(CHECK_VIOLATION);
  });

  it('rechaza un paso usado sin factor activo', async () => {
    await expect(
      insertUser({ secret: SOME_SECRET, enabledAt: null, lastUsedStep: SOME_STEP }),
    ).rejects.toThrow(CHECK_VIOLATION);
  });

  it('rechaza un paso negativo', async () => {
    await expect(
      insertUser({ secret: SOME_SECRET, enabledAt: new Date(), lastUsedStep: -1n }),
    ).rejects.toThrow(CHECK_VIOLATION);
  });
});

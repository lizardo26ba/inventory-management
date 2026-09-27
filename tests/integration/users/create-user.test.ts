/**
 * El alta de una cuenta contra una base real.
 *
 * La cuenta y su entrada en la bitácora se escriben en la misma transacción, así
 * que si la bitácora rechaza la entrada, la cuenta tampoco nace. Esa guarda
 * rechaza todo campo cuyo nombre suene a credencial, y una entrada que la
 * tropiece deja el alta rota para todo el mundo. Solo una prueba que recorra el
 * alta entera lo ve.
 */

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/db/client';
import type { AuditContext } from '@/modules/audit';
import { createUser } from '@/modules/users/repository';

const ACTOR = randomUUID();

/** Lo que la guarda de la bitácora nunca deja entrar. */
const CREDENTIAL_LIKE_KEY = /password|secret|token|hash|cookie|authorization/i;

const PLATFORM_SCOPE = { organizationId: null, userId: null, actingAsPlatformAdmin: true };

function auditContext(correlationId: string): AuditContext {
  return {
    actorId: ACTOR,
    organizationId: null,
    actingAsPlatformAdmin: false,
    permissionCode: 'platform.user:create',
    ipAddress: '203.0.113.9',
    userAgent: 'suite-de-integracion',
    correlationId,
  };
}

beforeAll(async () => {
  await prisma.$executeRaw`
    INSERT INTO currencies (id, code, name, symbol, decimal_places, is_active)
    VALUES (${randomUUID()}, 'GTQ', 'Quetzal', 'Q', 2, true)
    ON CONFLICT (code) DO NOTHING
  `;
  await prisma.$executeRaw`
    INSERT INTO countries (id, code, name, default_currency_code, default_time_zone,
      tax_id_label, phone_prefix, phone_mask, phone_example, is_active)
    VALUES (${randomUUID()}, 'GT', 'Guatemala', 'GTQ', 'America/Guatemala',
      'NIT', '+502', '#### ####', '2200 1100', true)
    ON CONFLICT (code) DO NOTHING
  `;
  await prisma.$executeRaw`
    INSERT INTO users (id, email, password_hash, first_name, last_name, status, locale,
      must_change_password, failed_login_attempts, version, created_by_id, updated_by_id,
      created_at, updated_at)
    VALUES (${ACTOR}, ${`alta-autor-${ACTOR}@example.test`}, 'sin-uso', 'Autor', 'Prueba',
      'ACTIVE', 'es', false, 0, 0, ${ACTOR}, ${ACTOR}, now(), now())
  `;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('alta de una cuenta', () => {
  it('crea la cuenta obligada a cambiar la contraseña y deja su rastro sin credenciales', async () => {
    const correlationId = randomUUID();
    const email = `alta-${correlationId}@example.test`;

    const created = await createUser(
      PLATFORM_SCOPE,
      {
        actorId: ACTOR,
        email,
        passwordHash: 'huella-de-prueba',
        firstName: 'Nueva',
        lastName: 'Cuenta',
        countryCode: 'GT',
        accesses: [],
      },
      auditContext(correlationId),
    );

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: created.id },
      select: { email: true, mustChangePassword: true, createdById: true },
    });
    expect(user).toEqual({ email, mustChangePassword: true, createdById: ACTOR });

    const entry = await prisma.auditLog.findFirstOrThrow({
      where: { correlationId, action: 'user.created' },
      select: { entityId: true, after: true },
    });
    expect(entry.entityId).toBe(created.id);
    expect(
      Object.keys(entry.after as object).filter((key) => CREDENTIAL_LIKE_KEY.test(key)),
    ).toEqual([]);
  });
});

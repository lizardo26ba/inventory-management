/**
 * Editar, suspender y eliminar una cuenta contra una base real.
 *
 * Son las tres escrituras que cambian qué puede hacer alguien, y las tres
 * escriben varias tablas y la bitácora en una sola transacción. Lo que solo una
 * base puede decir:
 *
 * - La versión protege la edición: con una vieja no se escribe nada.
 * - Los accesos se ajustan por diferencia: conceder, cambiar de rol, revocar sin
 *   borrar y revivir la misma membresía. Cada cambio deja su entrada en la
 *   empresa donde ocurre.
 * - El acceso de plataforma se concede y se revoca una vez, no en cada guardado.
 * - Pedir el estado que ya tenía no deja rastro.
 * - Eliminar conserva la fila, revoca sus accesos y cierra sus sesiones.
 */

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/db/client';
import type { AuditContext } from '@/modules/audit';
import {
  findUserById,
  setUserActive,
  softDeleteUser,
  updateUser,
  type UpdateUserData,
} from '@/modules/users/repository';

const ACTOR = randomUUID();

const COMPANY_A = randomUUID();
const COMPANY_B = randomUUID();
const ROLE_A1 = randomUUID();
const ROLE_A2 = randomUUID();
const ROLE_B1 = randomUUID();

const SESSION_EXPIRES = new Date('2030-01-01T00:00:00.000Z');

const PLATFORM_SCOPE = { organizationId: null, userId: null, actingAsPlatformAdmin: true };

function auditContext(correlationId: string): AuditContext {
  return {
    actorId: ACTOR,
    organizationId: null,
    actingAsPlatformAdmin: false,
    permissionCode: 'platform.user:update',
    ipAddress: '203.0.113.9',
    userAgent: 'suite-de-integracion',
    correlationId,
  };
}

async function insertUser(id: string): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO users (id, email, password_hash, first_name, last_name, status, locale,
      country_code, must_change_password, failed_login_attempts, version, created_by_id,
      updated_by_id, created_at, updated_at)
    VALUES (${id}, ${`ciclo-${id}@example.test`}, 'sin-uso', 'Cuenta', 'Prueba',
      'ACTIVE', 'es', 'GT', false, 0, 0, ${ACTOR}, ${ACTOR}, now(), now())
  `;
}

/** Una cuenta nueva por prueba: así ninguna depende del orden de las demás. */
async function newSubject(): Promise<string> {
  const id = randomUUID();
  await insertUser(id);
  return id;
}

async function openSession(userId: string): Promise<void> {
  await prisma.session.create({
    data: {
      tokenHash: `huella-${randomUUID()}`,
      userId,
      organizationId: null,
      expiresAt: SESSION_EXPIRES,
      ipAddress: '203.0.113.9',
      userAgent: 'suite-de-integracion',
    },
  });
}

async function versionOf(id: string): Promise<number> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
    select: { version: true },
  });
  return user.version;
}

function dataFor(
  id: string,
  overrides: Partial<Omit<UpdateUserData, 'actorId'>> = {},
): UpdateUserData {
  return {
    actorId: ACTOR,
    email: `ciclo-${id}@example.test`,
    firstName: 'Cuenta',
    lastName: 'Prueba',
    countryCode: 'GT',
    accesses: [],
    platformAdmin: { isGranted: false, reason: '' },
    ...overrides,
  };
}

/** Guarda con la versión actual y devuelve con qué identificador de correlación. */
async function save(
  id: string,
  overrides: Partial<Omit<UpdateUserData, 'actorId'>> = {},
): Promise<string> {
  const correlationId = randomUUID();
  const result = await updateUser(
    PLATFORM_SCOPE,
    id,
    await versionOf(id),
    dataFor(id, overrides),
    auditContext(correlationId),
  );
  expect(result).toEqual({ outcome: 'UPDATED' });
  return correlationId;
}

async function entriesOf(correlationId: string) {
  return prisma.auditLog.findMany({
    where: { correlationId },
    select: { action: true, organizationId: true, before: true, after: true },
    orderBy: { action: 'asc' },
  });
}

async function membershipIn(userId: string, organizationId: string) {
  return prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: {
      id: true,
      revokedAt: true,
      isActive: true,
      roles: { select: { roleId: true } },
    },
  });
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

  await insertUser(ACTOR);

  for (const [id, name] of [
    [COMPANY_A, 'Ciclo A'],
    [COMPANY_B, 'Ciclo B'],
  ] as const) {
    await prisma.$executeRaw`
      INSERT INTO organizations (id, slug, name, legal_name, country_code, base_currency_code,
        time_zone, locale, is_active, version, created_by_id, updated_by_id, created_at,
        updated_at)
      VALUES (${id}, ${`ciclo-${id.slice(0, 8)}`}, ${name}, ${name}, 'GT', 'GTQ',
        'America/Guatemala', 'es', true, 0, ${ACTOR}, ${ACTOR}, now(), now())
    `;
  }

  for (const [id, organizationId, name] of [
    [ROLE_A1, COMPANY_A, 'Ventas'],
    [ROLE_A2, COMPANY_A, 'Compras'],
    [ROLE_B1, COMPANY_B, 'Ventas'],
  ] as const) {
    await prisma.$executeRaw`
      INSERT INTO roles (id, organization_id, name, is_system, version, created_at, updated_at)
      VALUES (${id}, ${organizationId}, ${name}, false, 0, now(), now())
    `;
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('editar una cuenta', () => {
  it('cambia los datos, sube la versión y registra solo lo que cambió', async () => {
    const id = await newSubject();
    const before = await versionOf(id);

    const correlationId = await save(id, { firstName: 'Renombrada' });

    expect(await versionOf(id)).toBe(before + 1);
    const [entry, ...rest] = await entriesOf(correlationId);
    expect(rest).toEqual([]);
    expect(entry).toEqual({
      action: 'user.updated',
      organizationId: null,
      before: { firstName: 'Cuenta' },
      after: { firstName: 'Renombrada' },
    });
  });

  it('con una versión vieja no escribe nada', async () => {
    const id = await newSubject();
    const stale = await versionOf(id);
    await save(id, { firstName: 'Primera' });

    const correlationId = randomUUID();
    const result = await updateUser(
      PLATFORM_SCOPE,
      id,
      stale,
      dataFor(id, {
        firstName: 'Segunda',
        accesses: [{ organizationId: COMPANY_A, roleId: ROLE_A1 }],
      }),
      auditContext(correlationId),
    );

    expect(result).toEqual({ outcome: 'STALE_VERSION' });
    expect((await findUserById(PLATFORM_SCOPE, id))?.firstName).toBe('Primera');
    expect(await membershipIn(id, COMPANY_A)).toBeNull();
    expect(await entriesOf(correlationId)).toEqual([]);
  });

  it('una cuenta que no existe no se encuentra', async () => {
    const id = randomUUID();

    expect(
      await updateUser(PLATFORM_SCOPE, id, 0, dataFor(id), auditContext(randomUUID())),
    ).toEqual({ outcome: 'NOT_FOUND' });
  });
});

describe('los accesos a empresas', () => {
  it('conceder, cambiar de rol, revocar y revivir la misma membresía', async () => {
    const id = await newSubject();

    // Conceder: nace la membresía con su rol, y la entrada va a esa empresa.
    const granted = await save(id, {
      accesses: [
        { organizationId: COMPANY_A, roleId: ROLE_A1 },
        { organizationId: COMPANY_B, roleId: ROLE_B1 },
      ],
    });
    const original = await membershipIn(id, COMPANY_A);
    expect(original).toMatchObject({
      revokedAt: null,
      isActive: true,
      roles: [{ roleId: ROLE_A1 }],
    });
    expect(await entriesOf(granted)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'membership.granted', organizationId: COMPANY_A }),
        expect.objectContaining({ action: 'membership.granted', organizationId: COMPANY_B }),
      ]),
    );

    // Cambiar de rol: se sustituye, no se acumula.
    const changed = await save(id, {
      accesses: [
        { organizationId: COMPANY_A, roleId: ROLE_A2 },
        { organizationId: COMPANY_B, roleId: ROLE_B1 },
      ],
    });
    expect((await membershipIn(id, COMPANY_A))?.roles).toEqual([{ roleId: ROLE_A2 }]);
    expect(await entriesOf(changed)).toEqual([
      expect.objectContaining({
        action: 'membership.role_changed',
        organizationId: COMPANY_A,
        before: { role: 'Ventas' },
        after: { role: 'Compras' },
      }),
    ]);

    // Revocar: la fila se queda, marcada. La otra empresa no se toca.
    const revoked = await save(id, {
      accesses: [{ organizationId: COMPANY_B, roleId: ROLE_B1 }],
    });
    expect(await membershipIn(id, COMPANY_A)).toMatchObject({
      id: original?.id,
      isActive: false,
      revokedAt: expect.any(Date),
    });
    expect((await membershipIn(id, COMPANY_B))?.revokedAt).toBeNull();
    expect(await entriesOf(revoked)).toEqual([
      expect.objectContaining({ action: 'membership.revoked', organizationId: COMPANY_A }),
    ]);

    // Guardar otra vez sin cambios no vuelve a contar la revocación.
    const unchanged = await save(id, {
      accesses: [{ organizationId: COMPANY_B, roleId: ROLE_B1 }],
    });
    expect(await entriesOf(unchanged)).toEqual([]);

    // Revivir: la misma membresía, no una nueva.
    const revived = await save(id, {
      accesses: [
        { organizationId: COMPANY_A, roleId: ROLE_A1 },
        { organizationId: COMPANY_B, roleId: ROLE_B1 },
      ],
    });
    expect(await membershipIn(id, COMPANY_A)).toMatchObject({
      id: original?.id,
      revokedAt: null,
      isActive: true,
    });
    expect(await entriesOf(revived)).toEqual([
      expect.objectContaining({ action: 'membership.granted', organizationId: COMPANY_A }),
    ]);
  });
});

describe('el acceso de plataforma', () => {
  it('se concede una vez, no se repite al guardar, y se revoca dejando rastro', async () => {
    const id = await newSubject();
    const grant = { isGranted: true, reason: 'Soporte de segundo nivel.' };

    const granted = await save(id, { platformAdmin: grant });
    expect((await findUserById(PLATFORM_SCOPE, id))?.isPlatformAdmin).toBe(true);
    expect(await entriesOf(granted)).toEqual([
      expect.objectContaining({
        action: 'platform_admin.granted',
        after: { reason: 'Soporte de segundo nivel.' },
      }),
    ]);

    const again = await save(id, { platformAdmin: grant });
    expect(await entriesOf(again)).toEqual([]);

    const revoked = await save(id);
    expect((await findUserById(PLATFORM_SCOPE, id))?.isPlatformAdmin).toBe(false);
    expect(await entriesOf(revoked)).toEqual([
      expect.objectContaining({ action: 'platform_admin.revoked' }),
    ]);
    // La concesión se conserva, revocada: es el rastro de que alguien tuvo ese poder.
    const row = await prisma.platformAdmin.findUniqueOrThrow({ where: { userId: id } });
    expect(row.revokedAt).not.toBeNull();
  });
});

describe('suspender y reactivar', () => {
  it('cambia el estado una vez y registra solo el cambio', async () => {
    const id = await newSubject();

    const suspended = randomUUID();
    expect(await setUserActive(PLATFORM_SCOPE, id, false, ACTOR, auditContext(suspended))).toBe(
      true,
    );
    expect((await findUserById(PLATFORM_SCOPE, id))?.status).toBe('SUSPENDED');
    expect(await entriesOf(suspended)).toEqual([
      expect.objectContaining({
        action: 'user.deactivated',
        before: { status: 'ACTIVE' },
        after: { status: 'SUSPENDED' },
      }),
    ]);

    // Pedir el estado que ya tenía no es un cambio.
    const repeated = randomUUID();
    expect(await setUserActive(PLATFORM_SCOPE, id, false, ACTOR, auditContext(repeated))).toBe(
      true,
    );
    expect(await entriesOf(repeated)).toEqual([]);

    const reactivated = randomUUID();
    await setUserActive(PLATFORM_SCOPE, id, true, ACTOR, auditContext(reactivated));
    expect((await findUserById(PLATFORM_SCOPE, id))?.status).toBe('ACTIVE');
    expect(await entriesOf(reactivated)).toEqual([
      expect.objectContaining({ action: 'user.activated' }),
    ]);
  });

  it('una cuenta que no existe no cambia', async () => {
    expect(
      await setUserActive(
        PLATFORM_SCOPE,
        randomUUID(),
        false,
        ACTOR,
        auditContext(randomUUID()),
      ),
    ).toBe(false);
  });
});

describe('eliminar', () => {
  it('conserva la fila, revoca sus accesos, cierra sus sesiones y lo registra', async () => {
    const id = await newSubject();
    await save(id, {
      accesses: [
        { organizationId: COMPANY_A, roleId: ROLE_A1 },
        { organizationId: COMPANY_B, roleId: ROLE_B1 },
      ],
    });
    await openSession(id);
    await openSession(id);

    const correlationId = randomUUID();
    expect(await softDeleteUser(PLATFORM_SCOPE, id, ACTOR, auditContext(correlationId))).toBe(
      true,
    );

    const row = await prisma.user.findUniqueOrThrow({
      where: { id },
      select: { deletedAt: true, status: true },
    });
    expect(row).toEqual({ deletedAt: expect.any(Date), status: 'SUSPENDED' });
    expect(await findUserById(PLATFORM_SCOPE, id)).toBeNull();

    for (const organizationId of [COMPANY_A, COMPANY_B]) {
      expect((await membershipIn(id, organizationId))?.revokedAt).toEqual(row.deletedAt);
    }
    expect(await prisma.session.count({ where: { userId: id } })).toBe(0);

    expect(await entriesOf(correlationId)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: 'user.deleted', organizationId: null }),
        expect.objectContaining({ action: 'membership.revoked', organizationId: COMPANY_A }),
        expect.objectContaining({ action: 'membership.revoked', organizationId: COMPANY_B }),
      ]),
    );
    expect(await entriesOf(correlationId)).toHaveLength(3);
  });

  it('una cuenta ya eliminada no se elimina otra vez ni se edita', async () => {
    const id = await newSubject();
    await softDeleteUser(PLATFORM_SCOPE, id, ACTOR, auditContext(randomUUID()));

    const correlationId = randomUUID();
    expect(await softDeleteUser(PLATFORM_SCOPE, id, ACTOR, auditContext(correlationId))).toBe(
      false,
    );
    expect(
      await setUserActive(PLATFORM_SCOPE, id, true, ACTOR, auditContext(correlationId)),
    ).toBe(false);
    expect(
      await updateUser(
        PLATFORM_SCOPE,
        id,
        await versionOf(id),
        dataFor(id),
        auditContext(correlationId),
      ),
    ).toEqual({ outcome: 'NOT_FOUND' });
    expect(await entriesOf(correlationId)).toEqual([]);
  });
});

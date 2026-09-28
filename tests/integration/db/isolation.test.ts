/**
 * La segunda barrera: que una empresa no alcance los datos de otra.
 *
 * Esta es la prueba que sostiene el ADR 0010, y tiene una condición que no se ve:
 * **hay que conectarse con un rol sin `BYPASSRLS`**. El rol dueño de las tablas
 * tiene ese privilegio, así que con él las políticas ni siquiera se evalúan y la
 * prueba pasaría sin comprobar nada. Por eso aquí se crea un rol propio, con solo
 * permisos de datos, y todas las comprobaciones van por él.
 *
 * Lo que se fija:
 *
 * - Sin contexto no se ve nada. Falla cerrado, no abierto.
 * - Con una empresa se ve la suya y solo la suya.
 * - Escribir en la empresa ajena se rechaza, aunque el identificador sea válido.
 * - La excepción del super administrador deja ver por encima de todas. ADR 0005.
 * - El rol de la aplicación no puede saltarse las políticas.
 * - Sin empresa, la persona ve sus membresías activas, sus empresas y sus roles,
 *   y nada de nadie más. Lo revocado deja de verse. Leer lo propio no permite
 *   escribir. ADR 0013.
 */

import { randomUUID } from 'node:crypto';

import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/db/client';

/** Rol solo para esta suite. La base de pruebas se recrea entera en cada ejecución. */
const TEST_ROLE = 'inventory_app_test';

const ORGANIZATION_A = randomUUID();
const ORGANIZATION_B = randomUUID();
const AUTHOR = randomUUID();

/** Miembro de A, con una membresía revocada en B. */
const MEMBER = randomUUID();
/** Miembro de B, para comprobar que lo ajeno no se ve. */
const OTHER = randomUUID();
const MEMBERSHIP_MEMBER_A = randomUUID();
const MEMBERSHIP_MEMBER_B_REVOKED = randomUUID();
const MEMBERSHIP_OTHER_B = randomUUID();
const ROLE_A = randomUUID();
const ROLE_B = randomUUID();

let app: PrismaClient;

/** Lo que la aplicación declara al abrir una transacción. Aquí se hace a mano. */
async function asOrganization<T>(
  organizationId: string | null,
  platform: boolean,
  run: (tx: PrismaClient) => Promise<T>,
  userId: string | null = null,
): Promise<T> {
  return app.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT
        set_config('app.organization_id', ${organizationId ?? ''}, true),
        set_config('app.user_id', ${userId ?? ''}, true),
        set_config('app.platform_admin', ${platform ? 'on' : 'off'}, true)
    `;

    return run(tx as unknown as PrismaClient);
  });
}

/** Sin empresa ni excepción: solo la persona en el contexto. */
async function asPerson<T>(userId: string, run: (tx: PrismaClient) => Promise<T>): Promise<T> {
  return asOrganization(null, false, run, userId);
}

async function countOrganizations(tx: PrismaClient, id: string): Promise<number> {
  return tx.organization.count({ where: { id } });
}

beforeAll(async () => {
  const password = randomUUID();

  // Sin parámetros: CREATE ROLE no los acepta, y la contraseña se genera aquí
  // mismo, así que no viene de fuera. Es la excepción justificada al uso de
  // consultas sin procesar. Ver database-architect.md, sección 8.
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${TEST_ROLE}') THEN
        ALTER ROLE ${TEST_ROLE} LOGIN PASSWORD '${password}' NOBYPASSRLS;
      ELSE
        CREATE ROLE ${TEST_ROLE} LOGIN PASSWORD '${password}' NOBYPASSRLS;
      END IF;
    END
    $$;
  `);
  await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO ${TEST_ROLE}`);
  await prisma.$executeRawUnsafe(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${TEST_ROLE}`,
  );

  const url = new URL(process.env.TEST_DATABASE_URL ?? '');
  url.username = TEST_ROLE;
  url.password = password;
  app = new PrismaClient({ datasources: { db: { url: url.toString() } } });

  // Los datos se siembran con el rol dueño, que sí se salta las políticas. Lo que
  // se prueba es la lectura, no la siembra.
  //
  // El catálogo va primero: la base de pruebas se recrea solo con migraciones, sin
  // semillas, así que no hay país ni moneda a los que apuntar.
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
    VALUES (${AUTHOR}, ${`aislamiento-${AUTHOR}@example.test`}, 'sin-uso', 'Prueba', 'Aislamiento',
      'ACTIVE', 'es', false, 0, 0, ${AUTHOR}, ${AUTHOR}, now(), now())
  `;

  const empresas: readonly (readonly [string, string])[] = [
    [ORGANIZATION_A, 'Empresa A'],
    [ORGANIZATION_B, 'Empresa B'],
  ];

  for (const [id, name] of empresas) {
    await prisma.$executeRaw`
      INSERT INTO organizations (id, slug, name, legal_name, country_code, base_currency_code,
        time_zone, locale, is_active, version, created_by_id, updated_by_id, created_at, updated_at)
      VALUES (${id}, ${`aisl-${id.slice(0, 8)}`}, ${name}, ${name}, 'GT', 'GTQ',
        'America/Guatemala', 'es', true, 0, ${AUTHOR}, ${AUTHOR}, now(), now())
    `;
  }

  for (const [id, name] of [
    [MEMBER, 'Miembro'],
    [OTHER, 'Ajeno'],
  ] as const) {
    await prisma.$executeRaw`
      INSERT INTO users (id, email, password_hash, first_name, last_name, status, locale,
        must_change_password, failed_login_attempts, version, created_by_id, updated_by_id,
        created_at, updated_at)
      VALUES (${id}, ${`aislamiento-${id}@example.test`}, 'sin-uso', ${name}, 'Prueba',
        'ACTIVE', 'es', false, 0, 0, ${AUTHOR}, ${AUTHOR}, now(), now())
    `;
  }

  for (const [id, organizationId, name] of [
    [ROLE_A, ORGANIZATION_A, 'Ventas A'],
    [ROLE_B, ORGANIZATION_B, 'Ventas B'],
  ] as const) {
    await prisma.$executeRaw`
      INSERT INTO roles (id, organization_id, name, is_system, version, created_at, updated_at)
      VALUES (${id}, ${organizationId}, ${name}, false, 0, now(), now())
    `;
  }

  const memberships = [
    [MEMBERSHIP_MEMBER_A, MEMBER, ORGANIZATION_A, null, ROLE_A],
    [MEMBERSHIP_MEMBER_B_REVOKED, MEMBER, ORGANIZATION_B, new Date(), ROLE_B],
    [MEMBERSHIP_OTHER_B, OTHER, ORGANIZATION_B, null, ROLE_B],
  ] as const;

  for (const [id, userId, organizationId, revokedAt, roleId] of memberships) {
    await prisma.$executeRaw`
      INSERT INTO memberships (id, user_id, organization_id, is_active, version,
        created_by_id, updated_by_id, created_at, updated_at, revoked_at)
      VALUES (${id}, ${userId}, ${organizationId}, true, 0, ${AUTHOR}, ${AUTHOR}, now(), now(),
        ${revokedAt})
    `;
    await prisma.$executeRaw`
      INSERT INTO membership_roles (membership_id, role_id, assigned_at)
      VALUES (${id}, ${roleId}, now())
    `;
  }
});

afterAll(async () => {
  await app.$disconnect();
  await prisma.$disconnect();
});

describe('aislamiento entre empresas', () => {
  it('el rol de la aplicación no puede saltarse las políticas', async () => {
    const rows = await prisma.$queryRaw<{ readonly rolbypassrls: boolean }[]>`
      SELECT rolbypassrls FROM pg_roles WHERE rolname = ${TEST_ROLE}
    `;

    expect(rows[0]?.rolbypassrls).toBe(false);
  });

  it('sin contexto no se ve ninguna empresa', async () => {
    const visible = await asOrganization(null, false, (tx) =>
      countOrganizations(tx, ORGANIZATION_A),
    );

    expect(visible).toBe(0);
  });

  it('con una empresa se ve la suya', async () => {
    const visible = await asOrganization(ORGANIZATION_A, false, (tx) =>
      countOrganizations(tx, ORGANIZATION_A),
    );

    expect(visible).toBe(1);
  });

  it('y no se ve la ajena, aunque se pida por su identificador exacto', async () => {
    const visible = await asOrganization(ORGANIZATION_A, false, (tx) =>
      countOrganizations(tx, ORGANIZATION_B),
    );

    expect(visible).toBe(0);
  });

  it('una consulta sin filtro solo devuelve lo propio', async () => {
    const rows = await asOrganization(ORGANIZATION_A, false, (tx) =>
      tx.organization.findMany({ select: { id: true } }),
    );

    expect(rows.map((row) => row.id)).toEqual([ORGANIZATION_A]);
  });

  it('escribir en la empresa ajena se rechaza', async () => {
    await expect(
      asOrganization(ORGANIZATION_A, false, (tx) =>
        tx.auditLog.create({
          data: {
            organizationId: ORGANIZATION_B,
            actingAsPlatformAdmin: false,
            action: 'organization.updated',
            entityType: 'Organization',
            entityId: ORGANIZATION_B,
            correlationId: randomUUID(),
          },
        }),
      ),
    ).rejects.toThrow();
  });

  it('la consulta de la plataforma se registra con el alcance de la empresa consultada', async () => {
    // Es el alcance con que la puerta escribe la entrada antes de leer. ADR 0015.
    const correlationId = randomUUID();

    await asOrganization(ORGANIZATION_A, false, (tx) =>
      tx.auditLog.create({
        data: {
          organizationId: ORGANIZATION_A,
          actingAsPlatformAdmin: true,
          action: 'company_data.viewed',
          entityType: 'CompanyData',
          entityId: ORGANIZATION_A,
          correlationId,
        },
      }),
    );

    expect(await prisma.auditLog.count({ where: { correlationId } })).toBe(1);
  });

  it('la excepción del super administrador deja ver por encima de las empresas', async () => {
    const visible = await asOrganization(null, true, async (tx) => ({
      a: await countOrganizations(tx, ORGANIZATION_A),
      b: await countOrganizations(tx, ORGANIZATION_B),
    }));

    expect(visible).toEqual({ a: 1, b: 1 });
  });
});

describe('lo propio de la persona, sin empresa elegida', () => {
  it('ve sus membresías activas y no las revocadas ni las ajenas', async () => {
    const rows = await asPerson(MEMBER, (tx) =>
      tx.membership.findMany({ select: { id: true } }),
    );

    expect(rows.map((row) => row.id)).toEqual([MEMBERSHIP_MEMBER_A]);
  });

  it('ve las empresas a las que pertenece y ninguna más', async () => {
    const rows = await asPerson(MEMBER, (tx) =>
      tx.organization.findMany({ select: { id: true } }),
    );

    expect(rows.map((row) => row.id)).toEqual([ORGANIZATION_A]);
  });

  it('ve sus roles en esas empresas', async () => {
    const visible = await asPerson(MEMBER, async (tx) => ({
      roles: (await tx.role.findMany({ select: { id: true } })).map((row) => row.id),
      assignments: await tx.membershipRole.count(),
    }));

    expect(visible).toEqual({ roles: [ROLE_A], assignments: 1 });
  });

  it('sin persona en el contexto sigue sin verse nada', async () => {
    const visible = await asOrganization(null, false, (tx) => tx.membership.count());

    expect(visible).toBe(0);
  });

  it('leer lo propio no permite modificarlo', async () => {
    const changed = await asPerson(MEMBER, (tx) =>
      tx.membership.updateMany({
        where: { id: MEMBERSHIP_MEMBER_A },
        data: { isActive: false },
      }),
    );

    expect(changed.count).toBe(0);
  });

  it('ni darse acceso a otra empresa', async () => {
    await expect(
      asPerson(MEMBER, (tx) =>
        tx.membership.create({
          data: {
            userId: MEMBER,
            organizationId: ORGANIZATION_B,
            createdById: MEMBER,
            updatedById: MEMBER,
          },
        }),
      ),
    ).rejects.toThrow();
  });

  it('con empresa elegida se ve esa empresa y no lo que la persona tiene en otras', async () => {
    // Es el alcance de la operación: empresa sin persona. Ver companyScopeOf.
    const rows = await asOrganization(ORGANIZATION_B, false, (tx) =>
      tx.membership.findMany({ select: { id: true } }),
    );

    expect(rows.map((row) => row.id).sort()).toEqual(
      [MEMBERSHIP_MEMBER_B_REVOKED, MEMBERSHIP_OTHER_B].sort(),
    );
  });
});

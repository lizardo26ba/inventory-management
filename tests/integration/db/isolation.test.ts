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

let app: PrismaClient;

/** Lo que la aplicación declara al abrir una transacción. Aquí se hace a mano. */
async function asOrganization<T>(
  organizationId: string | null,
  platform: boolean,
  run: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  return app.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT
        set_config('app.organization_id', ${organizationId ?? ''}, true),
        set_config('app.platform_admin', ${platform ? 'on' : 'off'}, true)
    `;

    return run(tx as unknown as PrismaClient);
  });
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

  it('la excepción del super administrador deja ver por encima de las empresas', async () => {
    const visible = await asOrganization(null, true, async (tx) => ({
      a: await countOrganizations(tx, ORGANIZATION_A),
      b: await countOrganizations(tx, ORGANIZATION_B),
    }));

    expect(visible).toEqual({ a: 1, b: 1 });
  });
});

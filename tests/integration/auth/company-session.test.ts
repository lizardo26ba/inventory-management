/**
 * La empresa activa contra una base real. ADR 0013.
 *
 * Esta suite corre con el rol dueño, que se salta las políticas, así que lo que
 * prueba es el filtro propio de cada consulta: la segunda barrera. Que las
 * políticas también lo cumplan lo prueba `db/isolation.test.ts`.
 *
 * Lo que se fija:
 *
 * - Solo cuentan las membresías vivas en empresas vivas. RN-006.
 * - Los permisos salen de los roles de la persona en esa empresa y de ninguna otra.
 * - Cambiar de empresa rota el testigo sin alargar la sesión ni perder el segundo
 *   factor, y deja una entrada en la bitácora con la empresa afectada. ADR 0007.
 * - Si la sesión ya no existe, no se escribe nada.
 */

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/db/client';
import { AuthenticationError } from '@/lib/errors';
import type { AuditContext } from '@/modules/audit';
import {
  enterCompanySession,
  findCompanySummary,
  findEnterableOrganization,
  findLiveMembershipCompany,
  leaveCompanySession,
  listCompanyChoices,
  listCompanyPermissions,
} from '@/modules/auth/repository';

const AUTHOR = randomUUID();
const MEMBER = randomUUID();

/** Viva. La única que da acceso. */
const LIVE = randomUUID();
/** Membresía revocada. */
const REVOKED = randomUUID();
/** Empresa desactivada. */
const INACTIVE = randomUUID();
/** Empresa borrada. */
const DELETED = randomUUID();

const ROLE_LIVE = randomUUID();
const ROLE_REVOKED = randomUUID();
const PERMISSION = randomUUID();

const SESSION_EXPIRES = new Date('2030-01-01T00:00:00.000Z');
const TWO_FACTOR_AT = new Date('2026-09-27T12:00:00.000Z');

function auditContext(organizationId: string): AuditContext {
  return {
    actorId: MEMBER,
    organizationId,
    actingAsPlatformAdmin: false,
    permissionCode: null,
    ipAddress: '203.0.113.9',
    userAgent: 'suite-de-integracion',
    correlationId: randomUUID(),
  };
}

async function insertSession(tokenHash: string): Promise<void> {
  await prisma.session.create({
    data: {
      tokenHash,
      userId: MEMBER,
      organizationId: null,
      twoFactorVerifiedAt: TWO_FACTOR_AT,
      expiresAt: SESSION_EXPIRES,
      ipAddress: '203.0.113.9',
      userAgent: 'suite-de-integracion',
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

  for (const [id, name] of [
    [AUTHOR, 'Autor'],
    [MEMBER, 'Miembro'],
  ] as const) {
    await prisma.$executeRaw`
      INSERT INTO users (id, email, password_hash, first_name, last_name, status, locale,
        must_change_password, failed_login_attempts, version, created_by_id, updated_by_id,
        created_at, updated_at)
      VALUES (${id}, ${`empresa-activa-${id}@example.test`}, 'sin-uso', ${name}, 'Prueba',
        'ACTIVE', 'es', false, 0, 0, ${AUTHOR}, ${AUTHOR}, now(), now())
    `;
  }

  const organizations = [
    [LIVE, 'Viva', true, null],
    [REVOKED, 'Revocada', true, null],
    [INACTIVE, 'Desactivada', false, null],
    [DELETED, 'Borrada', true, new Date()],
  ] as const;

  for (const [id, name, isActive, deletedAt] of organizations) {
    await prisma.$executeRaw`
      INSERT INTO organizations (id, slug, name, legal_name, country_code, base_currency_code,
        time_zone, locale, is_active, version, created_by_id, updated_by_id, created_at,
        updated_at, deleted_at)
      VALUES (${id}, ${`activa-${id.slice(0, 8)}`}, ${name}, ${name}, 'GT', 'GTQ',
        'America/Guatemala', 'es', ${isActive}, 0, ${AUTHOR}, ${AUTHOR}, now(), now(),
        ${deletedAt})
    `;
  }

  // La base de pruebas nace sin semillas, así que el permiso se escribe aquí.
  await prisma.$executeRaw`
    INSERT INTO permissions (id, code, resource, action, description, scope)
    VALUES (${PERMISSION}, 'product:read', 'product', 'read', 'Ver productos', 'ORGANIZATION')
    ON CONFLICT (code) DO NOTHING
  `;
  const [permission] = await prisma.$queryRaw<{ readonly id: string }[]>`
    SELECT id FROM permissions WHERE code = 'product:read'
  `;

  for (const [roleId, organizationId] of [
    [ROLE_LIVE, LIVE],
    [ROLE_REVOKED, REVOKED],
  ] as const) {
    await prisma.$executeRaw`
      INSERT INTO roles (id, organization_id, name, is_system, version, created_at, updated_at)
      VALUES (${roleId}, ${organizationId}, 'Consulta', false, 0, now(), now())
    `;
    await prisma.$executeRaw`
      INSERT INTO role_permissions (role_id, permission_id, granted_at)
      VALUES (${roleId}, ${permission?.id}, now())
    `;
  }

  const memberships = [
    [LIVE, null, ROLE_LIVE],
    [REVOKED, new Date(), ROLE_REVOKED],
    [INACTIVE, null, null],
    [DELETED, null, null],
  ] as const;

  for (const [organizationId, revokedAt, roleId] of memberships) {
    const membershipId = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO memberships (id, user_id, organization_id, is_active, version,
        created_by_id, updated_by_id, created_at, updated_at, revoked_at)
      VALUES (${membershipId}, ${MEMBER}, ${organizationId}, true, 0, ${AUTHOR}, ${AUTHOR},
        now(), now(), ${revokedAt})
    `;
    if (roleId !== null) {
      await prisma.$executeRaw`
        INSERT INTO membership_roles (membership_id, role_id, assigned_at)
        VALUES (${membershipId}, ${roleId}, now())
      `;
    }
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('las empresas de una persona', () => {
  it('solo ofrece las membresías vivas en empresas vivas, con sus roles', async () => {
    const choices = await listCompanyChoices(MEMBER);

    expect(choices).toEqual([
      {
        organizationId: LIVE,
        name: 'Viva',
        countryCode: 'GT',
        countryName: 'Guatemala',
        baseCurrencyCode: 'GTQ',
        roles: [{ code: null, name: 'Consulta' }],
      },
    ]);
  });

  it('la membresía viva se encuentra, y ninguna de las demás', async () => {
    expect(await findLiveMembershipCompany(MEMBER, LIVE)).toEqual({ id: LIVE, name: 'Viva' });

    for (const organizationId of [REVOKED, INACTIVE, DELETED]) {
      expect(await findLiveMembershipCompany(MEMBER, organizationId)).toBeNull();
    }
  });

  it('los permisos salen de sus roles en esa empresa y no de una revocada', async () => {
    expect(await listCompanyPermissions(MEMBER, LIVE)).toEqual(['product:read']);
    expect(await listCompanyPermissions(MEMBER, REVOKED)).toEqual([]);
  });
});

describe('la empresa a la que entra un super administrador', () => {
  it('puede ser una desactivada, para diagnosticarla', async () => {
    expect(await findEnterableOrganization(INACTIVE)).toEqual({
      id: INACTIVE,
      name: 'Desactivada',
    });
  });

  it('no una borrada', async () => {
    expect(await findEnterableOrganization(DELETED)).toBeNull();
  });
});

describe('lo que el marco enseña de la empresa activa', () => {
  it('trae su nombre, país y moneda', async () => {
    expect(await findCompanySummary(LIVE)).toEqual({
      name: 'Viva',
      countryCode: 'GT',
      baseCurrencyCode: 'GTQ',
    });
  });

  it('no trae una empresa borrada', async () => {
    expect(await findCompanySummary(DELETED)).toBeNull();
  });
});

describe('cambiar la empresa de la sesión', () => {
  it('entrar rota el testigo, conserva la caducidad y el segundo factor, y lo registra', async () => {
    const before = `antes-${randomUUID()}`;
    const after = `despues-${randomUUID()}`;
    const context = auditContext(LIVE);
    await insertSession(before);

    await enterCompanySession(
      {
        currentTokenHash: before,
        nextTokenHash: after,
        organizationId: LIVE,
        actingAsPlatformAdmin: false,
      },
      context,
    );

    expect(await prisma.session.findUnique({ where: { tokenHash: before } })).toBeNull();
    expect(
      await prisma.session.findUnique({
        where: { tokenHash: after },
        select: {
          organizationId: true,
          actingAsPlatformAdmin: true,
          expiresAt: true,
          twoFactorVerifiedAt: true,
        },
      }),
    ).toEqual({
      organizationId: LIVE,
      actingAsPlatformAdmin: false,
      expiresAt: SESSION_EXPIRES,
      twoFactorVerifiedAt: TWO_FACTOR_AT,
    });

    const entries = await prisma.auditLog.findMany({
      where: { correlationId: context.correlationId },
      select: { action: true, organizationId: true, entityLabel: true, after: true },
    });
    expect(entries).toEqual([
      {
        action: 'auth.company_entered',
        organizationId: LIVE,
        entityLabel: 'Viva',
        after: { organizationId: LIVE },
      },
    ]);
  });

  it('salir deja la sesión sin empresa y registra la empresa que se deja', async () => {
    const inside = `dentro-${randomUUID()}`;
    const outside = `fuera-${randomUUID()}`;
    await insertSession(inside);
    await prisma.session.update({
      where: { tokenHash: inside },
      data: { organizationId: LIVE },
    });
    const context = auditContext(LIVE);

    await leaveCompanySession(
      { currentTokenHash: inside, nextTokenHash: outside, organizationId: LIVE },
      context,
    );

    expect(
      await prisma.session.findUnique({
        where: { tokenHash: outside },
        select: { organizationId: true },
      }),
    ).toEqual({ organizationId: null });

    const [entry] = await prisma.auditLog.findMany({
      where: { correlationId: context.correlationId },
      select: { action: true, organizationId: true, before: true },
    });
    expect(entry).toEqual({
      action: 'auth.company_left',
      organizationId: LIVE,
      before: { organizationId: LIVE },
    });
  });

  it('si la sesión ya no existe, no crea otra ni escribe en la bitácora', async () => {
    const orphan = `huerfana-${randomUUID()}`;
    const context = auditContext(LIVE);

    await expect(
      enterCompanySession(
        {
          currentTokenHash: `inexistente-${randomUUID()}`,
          nextTokenHash: orphan,
          organizationId: LIVE,
          actingAsPlatformAdmin: false,
        },
        context,
      ),
    ).rejects.toThrow(AuthenticationError);

    expect(await prisma.session.findUnique({ where: { tokenHash: orphan } })).toBeNull();
    expect(
      await prisma.auditLog.count({ where: { correlationId: context.correlationId } }),
    ).toBe(0);
  });
});

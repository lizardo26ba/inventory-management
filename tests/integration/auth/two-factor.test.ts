/**
 * El segundo factor contra una base real. ADR 0014.
 *
 * Lo que solo una base puede decir:
 *
 * - El alta pendiente no se pisa: dos pestañas se quedan con el mismo secreto.
 * - Un código aceptado rota la sesión sin alargarla, y deja su rastro.
 * - Un paso ya usado se rechaza en la escritura, aunque llegue por otra petición.
 * - Restablecer deja la cuenta sin alta y cierra todas sus sesiones.
 */

import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '@/lib/db/client';
import type { AuditContext } from '@/modules/audit';
import {
  acceptTwoFactorCode,
  findTwoFactorState,
  savePendingTwoFactorSecret,
} from '@/modules/auth/repository';
import { findUserById, resetUserTwoFactor } from '@/modules/users/repository';

const ADMIN = randomUUID();
const OTHER_ADMIN = randomUUID();

const SESSION_EXPIRES = new Date('2030-01-01T00:00:00.000Z');
const STEP = 59_000_000n;

const PLATFORM_SCOPE = { organizationId: null, userId: null, actingAsPlatformAdmin: true };

function auditContext(actorId: string, correlationId: string): AuditContext {
  return {
    actorId,
    organizationId: null,
    actingAsPlatformAdmin: false,
    permissionCode: null,
    ipAddress: '203.0.113.9',
    userAgent: 'suite-de-integracion',
    correlationId,
  };
}

async function openSession(userId: string): Promise<string> {
  const tokenHash = `huella-${randomUUID()}`;
  await prisma.session.create({
    data: {
      tokenHash,
      userId,
      organizationId: null,
      expiresAt: SESSION_EXPIRES,
      ipAddress: '203.0.113.9',
      userAgent: 'suite-de-integracion',
    },
  });
  return tokenHash;
}

async function accept(input: {
  readonly step: bigint;
  readonly activates: boolean;
  readonly currentTokenHash: string;
  readonly correlationId?: string;
}): Promise<{ readonly accepted: boolean; readonly nextTokenHash: string }> {
  const nextTokenHash = `huella-${randomUUID()}`;
  const accepted = await acceptTwoFactorCode(
    {
      userId: ADMIN,
      email: `segundo-factor-${ADMIN}@example.test`,
      step: input.step,
      activates: input.activates,
      verifiedAt: new Date(),
      currentTokenHash: input.currentTokenHash,
      nextTokenHash,
    },
    auditContext(ADMIN, input.correlationId ?? randomUUID()),
  );
  return { accepted, nextTokenHash };
}

beforeAll(async () => {
  for (const id of [ADMIN, OTHER_ADMIN]) {
    await prisma.$executeRaw`
      INSERT INTO users (id, email, password_hash, first_name, last_name, status, locale,
        must_change_password, failed_login_attempts, version, created_by_id, updated_by_id,
        created_at, updated_at)
      VALUES (${id}, ${`segundo-factor-${id}@example.test`}, 'sin-uso', 'Plata', 'Forma',
        'ACTIVE', 'es', false, 3, 0, ${id}, ${id}, now(), now())
    `;
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('el ciclo del segundo factor', () => {
  it('el alta pendiente se guarda una vez; la segunda pestaña no la pisa', async () => {
    expect(await savePendingTwoFactorSecret(ADMIN, 'v1:primero')).toBe(true);
    expect(await savePendingTwoFactorSecret(ADMIN, 'v1:segundo')).toBe(false);

    const state = await findTwoFactorState(ADMIN);
    expect(state?.sealedSecret).toBe('v1:primero');
    expect(state?.enabledAt).toBeNull();
    // La ficha lo ve como un alta a medio confirmar, sin recibir el secreto.
    const detail = await findUserById(PLATFORM_SCOPE, ADMIN);
    expect(detail?.twoFactorStatus).toBe('PENDING');
    expect(detail).not.toHaveProperty('twoFactorSecret');
  });

  it('verificar no sirve mientras el alta está pendiente', async () => {
    const tokenHash = await openSession(ADMIN);

    expect(
      (await accept({ step: STEP, activates: false, currentTokenHash: tokenHash })).accepted,
    ).toBe(false);
    // La sesión sigue como estaba: no se rotó nada.
    expect(await prisma.session.count({ where: { tokenHash } })).toBe(1);
  });

  it('confirmar activa, limpia los intentos y rota la sesión sin alargarla', async () => {
    const tokenHash = await openSession(ADMIN);
    const correlationId = randomUUID();

    const { accepted, nextTokenHash } = await accept({
      step: STEP,
      activates: true,
      currentTokenHash: tokenHash,
      correlationId,
    });
    expect(accepted).toBe(true);

    const state = await findTwoFactorState(ADMIN);
    expect(state?.enabledAt).not.toBeNull();
    expect(state?.lastUsedStep).toBe(STEP);
    expect(state?.failedLoginAttempts).toBe(0);

    expect(await prisma.session.count({ where: { tokenHash } })).toBe(0);
    const next = await prisma.session.findUniqueOrThrow({
      where: { tokenHash: nextTokenHash },
    });
    expect(next.twoFactorVerifiedAt).not.toBeNull();
    expect(next.expiresAt).toEqual(SESSION_EXPIRES);

    const entry = await prisma.auditLog.findFirstOrThrow({ where: { correlationId } });
    expect(entry.action).toBe('auth.two_factor_enabled');
    expect((await findUserById(PLATFORM_SCOPE, ADMIN))?.twoFactorStatus).toBe('ACTIVE');
  });

  it('el mismo paso no vale dos veces, ni uno anterior', async () => {
    const tokenHash = await openSession(ADMIN);

    for (const step of [STEP, STEP - 1n]) {
      expect(
        (await accept({ step, activates: false, currentTokenHash: tokenHash })).accepted,
      ).toBe(false);
    }
    expect(await prisma.session.count({ where: { tokenHash } })).toBe(1);
  });

  it('confirmar otra vez no sirve con el factor ya activo', async () => {
    const tokenHash = await openSession(ADMIN);

    expect(
      (await accept({ step: STEP + 5n, activates: true, currentTokenHash: tokenHash }))
        .accepted,
    ).toBe(false);
  });

  it('un paso posterior verifica y queda como verificación', async () => {
    const tokenHash = await openSession(ADMIN);
    const correlationId = randomUUID();

    const { accepted } = await accept({
      step: STEP + 1n,
      activates: false,
      currentTokenHash: tokenHash,
      correlationId,
    });

    expect(accepted).toBe(true);
    expect((await findTwoFactorState(ADMIN))?.lastUsedStep).toBe(STEP + 1n);
    const entry = await prisma.auditLog.findFirstOrThrow({ where: { correlationId } });
    expect(entry.action).toBe('auth.two_factor_verified');
  });
});

describe('restablecer', () => {
  it('deja la cuenta sin alta, cierra todas sus sesiones y lo registra', async () => {
    await openSession(ADMIN);
    await openSession(ADMIN);
    const correlationId = randomUUID();

    const result = await resetUserTwoFactor(
      PLATFORM_SCOPE,
      ADMIN,
      OTHER_ADMIN,
      auditContext(OTHER_ADMIN, correlationId),
    );

    expect(result).toBe('RESET');
    const state = await findTwoFactorState(ADMIN);
    expect(state).toMatchObject({ sealedSecret: null, enabledAt: null, lastUsedStep: null });
    expect(await prisma.session.count({ where: { userId: ADMIN } })).toBe(0);

    const entry = await prisma.auditLog.findFirstOrThrow({ where: { correlationId } });
    expect(entry).toMatchObject({ action: 'user.two_factor_reset', actorId: OTHER_ADMIN });
    expect(entry.after).toEqual({ twoFactorEnabled: false });
    expect((await findUserById(PLATFORM_SCOPE, ADMIN))?.twoFactorStatus).toBe('NONE');
  });

  it('sin alta no hay nada que restablecer, y no se escribe nada', async () => {
    expect(
      await resetUserTwoFactor(
        PLATFORM_SCOPE,
        ADMIN,
        OTHER_ADMIN,
        auditContext(OTHER_ADMIN, randomUUID()),
      ),
    ).toBe('NOTHING_TO_RESET');
  });

  it('una cuenta que no existe no se encuentra', async () => {
    expect(
      await resetUserTwoFactor(
        PLATFORM_SCOPE,
        randomUUID(),
        OTHER_ADMIN,
        auditContext(OTHER_ADMIN, randomUUID()),
      ),
    ).toBe('NOT_FOUND');
  });
});

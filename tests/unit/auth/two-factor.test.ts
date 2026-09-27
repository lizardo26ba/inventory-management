/**
 * Comprobar el código del segundo factor, con la base simulada. ADR 0014.
 *
 * Casi todo son rechazos, porque es lo que protege: un código equivocado, uno ya
 * usado, uno escrito en la pantalla que no toca, y el bloqueo que cierra la
 * sesión. Que la base haga su parte, rechazar el código repetido en la escritura,
 * lo prueba la suite de integración.
 */

import { randomBytes } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SECRET_BOX_KEY_BYTES, sealSecret } from '@/lib/auth/secret-box';
import { hotp, totpStepAt } from '@/lib/auth/totp';
import type { AuditContext } from '@/modules/audit';
import type { TwoFactorState } from '@/modules/auth/repository';
import type { SessionContext } from '@/modules/auth/session-context';

const KEY = randomBytes(SECRET_BOX_KEY_BYTES);
const SECRET = randomBytes(20);

vi.mock('server-only', () => ({}));

vi.mock('@/lib/config/env.server', () => ({
  isProduction: false,
  twoFactorEncryptionKey: KEY,
  serverEnv: { AUTH_SECRET: 'clave-de-prueba-de-al-menos-32-caracteres' },
}));

vi.mock('@/lib/config/env.client', () => ({
  clientEnv: { appUrl: 'http://localhost:3000', environmentLabel: 'pruebas' },
}));

const repository = vi.hoisted(() => ({
  acceptTwoFactorCode: vi.fn(),
  deleteSession: vi.fn(),
  findTwoFactorState: vi.fn(),
  registerFailedAttempt: vi.fn(),
  savePendingTwoFactorSecret: vi.fn(),
}));

vi.mock('@/modules/auth/repository', () => repository);

const { loadTwoFactorSetup, submitTwoFactorCode } = await import('@/modules/auth/two-factor');

const SESSION: SessionContext = {
  userId: 'u-1',
  email: 'plataforma@example.test',
  firstName: 'Plata',
  lastName: 'Forma',
  locale: 'es',
  organizationId: null,
  isPlatformAdmin: true,
  actingAsPlatformAdmin: false,
  twoFactorEnabled: true,
  twoFactorVerifiedAt: null,
  mustChangePassword: false,
};

const AUDIT = {} as AuditContext;
const TOKEN_HASH = 'huella-actual';

function stateOf(overrides: Partial<TwoFactorState> = {}): TwoFactorState {
  return {
    email: SESSION.email,
    sealedSecret: sealSecret(SECRET, KEY),
    enabledAt: new Date('2026-09-01T00:00:00Z'),
    lastUsedStep: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    ...overrides,
  };
}

function currentCode(): string {
  return hotp(SECRET, totpStepAt(new Date()));
}

function submit(code: string, purpose: 'VERIFY' | 'CONFIRM_SETUP' = 'VERIFY') {
  return submitTwoFactorCode({
    session: SESSION,
    purpose,
    code,
    currentTokenHash: TOKEN_HASH,
    audit: AUDIT,
  });
}

/** Un código que no es el de ahora ni el de los pasos vecinos. */
function wrongCode(): string {
  const step = totpStepAt(new Date());
  const near = [-1n, 0n, 1n].map((offset) => hotp(SECRET, step + offset));
  for (let candidate = 0; ; candidate += 1) {
    const code = String(candidate).padStart(6, '0');
    if (!near.includes(code)) return code;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  repository.acceptTwoFactorCode.mockResolvedValue(true);
});

describe('verificar el código', () => {
  it('con el código de ahora, acepta, rota la sesión y no cuenta fallo', async () => {
    repository.findTwoFactorState.mockResolvedValue(stateOf());

    const outcome = await submit(currentCode());

    expect(outcome.kind).toBe('ACCEPTED');
    expect(repository.acceptTwoFactorCode).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u-1',
        activates: false,
        currentTokenHash: TOKEN_HASH,
      }),
      AUDIT,
    );
    expect(repository.registerFailedAttempt).not.toHaveBeenCalled();
  });

  it('con un código equivocado, rechaza y suma un intento', async () => {
    repository.findTwoFactorState.mockResolvedValue(stateOf({ failedLoginAttempts: 1 }));

    expect(await submit(wrongCode())).toEqual({ kind: 'INVALID' });
    expect(repository.acceptTwoFactorCode).not.toHaveBeenCalled();
    expect(repository.registerFailedAttempt).toHaveBeenCalledWith(
      { id: 'u-1', email: SESSION.email },
      { failedLoginAttempts: 2, lockedUntil: null },
      AUDIT,
    );
    expect(repository.deleteSession).not.toHaveBeenCalled();
  });

  it('al quinto fallo bloquea la cuenta y cierra la sesión', async () => {
    repository.findTwoFactorState.mockResolvedValue(stateOf({ failedLoginAttempts: 4 }));

    expect(await submit(wrongCode())).toEqual({ kind: 'LOCKED' });
    expect(repository.registerFailedAttempt).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ failedLoginAttempts: 5, lockedUntil: expect.any(Date) }),
      AUDIT,
    );
    expect(repository.deleteSession).toHaveBeenCalledWith(TOKEN_HASH);
  });

  it('con la cuenta ya bloqueada no mira el código, ni siquiera el bueno', async () => {
    repository.findTwoFactorState.mockResolvedValue(
      stateOf({ lockedUntil: new Date(Date.now() + 60_000) }),
    );

    expect(await submit(currentCode())).toEqual({ kind: 'LOCKED' });
    expect(repository.acceptTwoFactorCode).not.toHaveBeenCalled();
    expect(repository.deleteSession).toHaveBeenCalledWith(TOKEN_HASH);
  });

  it('rechaza repetir el código del paso ya usado, y lo cuenta como fallo', async () => {
    repository.findTwoFactorState.mockResolvedValue(
      stateOf({ lastUsedStep: totpStepAt(new Date()) }),
    );

    expect(await submit(currentCode())).toEqual({ kind: 'INVALID' });
    expect(repository.acceptTwoFactorCode).not.toHaveBeenCalled();
    expect(repository.registerFailedAttempt).toHaveBeenCalledTimes(1);
  });

  it('si otra petición lo aceptó entre medias, tampoco vale aquí', async () => {
    repository.findTwoFactorState.mockResolvedValue(stateOf());
    repository.acceptTwoFactorCode.mockResolvedValue(false);

    expect(await submit(currentCode())).toEqual({ kind: 'INVALID' });
    expect(repository.registerFailedAttempt).toHaveBeenCalledTimes(1);
  });
});

describe('cada pantalla, su estado', () => {
  it('verificar no sirve para confirmar un alta pendiente', async () => {
    repository.findTwoFactorState.mockResolvedValue(stateOf({ enabledAt: null }));

    expect(await submit(currentCode(), 'VERIFY')).toEqual({ kind: 'WRONG_STATE' });
    expect(repository.acceptTwoFactorCode).not.toHaveBeenCalled();
  });

  it('confirmar no sirve con un factor ya activo', async () => {
    repository.findTwoFactorState.mockResolvedValue(stateOf());

    expect(await submit(currentCode(), 'CONFIRM_SETUP')).toEqual({ kind: 'WRONG_STATE' });
    expect(repository.acceptTwoFactorCode).not.toHaveBeenCalled();
  });

  it('sin alta no hay nada que comprobar', async () => {
    repository.findTwoFactorState.mockResolvedValue(
      stateOf({ sealedSecret: null, enabledAt: null }),
    );

    expect(await submit(currentCode(), 'CONFIRM_SETUP')).toEqual({ kind: 'WRONG_STATE' });
  });

  it('confirmar un alta pendiente la activa', async () => {
    repository.findTwoFactorState.mockResolvedValue(stateOf({ enabledAt: null }));

    expect((await submit(currentCode(), 'CONFIRM_SETUP')).kind).toBe('ACCEPTED');
    expect(repository.acceptTwoFactorCode).toHaveBeenCalledWith(
      expect.objectContaining({ activates: true }),
      AUDIT,
    );
  });
});

describe('preparar el alta', () => {
  it('sin alta, crea una pendiente y enseña su QR y su clave', async () => {
    const pending = stateOf({ enabledAt: null });
    repository.findTwoFactorState
      .mockResolvedValueOnce(stateOf({ sealedSecret: null, enabledAt: null }))
      .mockResolvedValueOnce(pending);

    const setup = await loadTwoFactorSetup(SESSION);

    expect(repository.savePendingTwoFactorSecret).toHaveBeenCalledWith(
      'u-1',
      expect.stringMatching(/^v1:/),
    );
    expect(setup?.qrSvg).toContain('<svg');
    // La clave es la del secreto que quedó guardado, de cuatro en cuatro.
    expect(setup?.manualKey).toMatch(/^([A-Z2-7]{4} )+[A-Z2-7]{1,4}$/);
  });

  it('con una pendiente, enseña la misma sin crear otra', async () => {
    repository.findTwoFactorState.mockResolvedValue(stateOf({ enabledAt: null }));

    const first = await loadTwoFactorSetup(SESSION);
    const second = await loadTwoFactorSetup(SESSION);

    expect(repository.savePendingTwoFactorSecret).not.toHaveBeenCalled();
    expect(second?.manualKey).toBe(first?.manualKey);
  });

  it('con el factor activo no enseña nada: cambiar de teléfono es restablecer', async () => {
    repository.findTwoFactorState.mockResolvedValue(stateOf());

    expect(await loadTwoFactorSetup(SESSION)).toBeNull();
    expect(repository.savePendingTwoFactorSecret).not.toHaveBeenCalled();
  });
});

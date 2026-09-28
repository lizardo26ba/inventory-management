/**
 * Las puertas de la empresa activa, en el punto único de autorización.
 *
 * La base se simula: lo que se fija es qué decide `session.ts` con lo que la base
 * le cuenta. Que la base cuente la verdad lo prueban las suites de integración.
 *
 * Casi todo son rechazos, porque es lo que protege: un miembro sin membresía viva,
 * un permiso que no tiene, un super administrador sin segundo factor, una empresa
 * borrada. RN-004, RN-005, RN-006, ADR 0005 y ADR 0013.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PermissionCode } from '@/lib/auth/permissions';
import { AuthorizationError, NotFoundError, TwoFactorRequiredError } from '@/lib/errors';
import type { ActiveSession } from '@/modules/auth/repository';
import type { SessionContext } from '@/modules/auth/session-context';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/config/env.server', () => ({
  get isProduction(): boolean {
    return false;
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ get: () => ({ value: 'testigo' }) })),
  headers: vi.fn(),
}));

const repository = vi.hoisted(() => ({
  deleteSession: vi.fn(),
  findSessionByHash: vi.fn(),
  findLiveMembershipCompany: vi.fn(),
  listCompanyPermissions: vi.fn(),
  findEnterableOrganization: vi.fn(),
  listCompanyChoices: vi.fn(),
}));

vi.mock('@/modules/auth/repository', () => repository);

const AUDIT_CONTEXT = { correlationId: 'c-1' };

const audit = vi.hoisted(() => ({
  buildAuditContext: vi.fn(),
  recordAuditEntriesAlone: vi.fn(),
}));

vi.mock('@/modules/audit', () => audit);

vi.mock('@/modules/auth/service', () => ({
  hashSessionToken: () => 'huella',
  isSessionExpired: () => false,
  SESSION_LIFETIME_MS: 0,
}));

const {
  authorizeAutomaticEntry,
  authorizeCompanyEntry,
  getSession,
  holdsCompanyPermission,
  requireCompanyPermission,
  requireCompanySession,
  requireTwoFactorChallenge,
} = await import('@/modules/auth/session');

const COMPANY = { id: 'org-1', name: 'Empresa Uno' };
const VERIFIED = new Date('2026-09-27T12:00:00Z');

type StoredSessionOverrides = Partial<Omit<ActiveSession, 'user'>> & {
  readonly user?: Partial<ActiveSession['user']>;
};

function storedSession(overrides: StoredSessionOverrides = {}): ActiveSession {
  const { user, ...rest } = overrides;
  return {
    id: 's-1',
    tokenHash: 'huella',
    userId: 'u-1',
    organizationId: null,
    actingAsPlatformAdmin: false,
    twoFactorVerifiedAt: null,
    expiresAt: new Date('2026-09-28T00:00:00Z'),
    ...rest,
    user: {
      email: 'persona@example.test',
      firstName: 'Persona',
      lastName: 'De prueba',
      locale: 'es',
      status: 'ACTIVE',
      mustChangePassword: false,
      isPlatformAdmin: false,
      twoFactorEnabled: false,
      ...user,
    },
  };
}

function sessionOf(overrides: Partial<SessionContext> = {}): SessionContext {
  return {
    userId: 'u-1',
    email: 'persona@example.test',
    firstName: 'Persona',
    lastName: 'De prueba',
    locale: 'es',
    organizationId: null,
    isPlatformAdmin: false,
    actingAsPlatformAdmin: false,
    twoFactorEnabled: false,
    twoFactorVerifiedAt: null,
    mustChangePassword: false,
    ...overrides,
  };
}

function grants(...codes: PermissionCode[]): void {
  repository.listCompanyPermissions.mockResolvedValue(codes);
}

beforeEach(() => {
  vi.clearAllMocks();
  repository.findLiveMembershipCompany.mockResolvedValue(COMPANY);
  repository.findEnterableOrganization.mockResolvedValue(COMPANY);
  grants('product:read');
  audit.buildAuditContext.mockResolvedValue(AUDIT_CONTEXT);
  audit.recordAuditEntriesAlone.mockResolvedValue(undefined);
});

describe('getSession y la membresía viva (RN-006)', () => {
  it('un miembro cuya membresía se retiró pierde la sesión en la petición siguiente', async () => {
    repository.findSessionByHash.mockResolvedValue(storedSession({ organizationId: 'org-1' }));
    repository.findLiveMembershipCompany.mockResolvedValue(null);

    expect(await getSession()).toBeNull();
    expect(repository.deleteSession).toHaveBeenCalledWith('huella');
  });

  it('con la membresía viva, la sesión sigue', async () => {
    repository.findSessionByHash.mockResolvedValue(storedSession({ organizationId: 'org-1' }));

    expect((await getSession())?.organizationId).toBe('org-1');
    expect(repository.deleteSession).not.toHaveBeenCalled();
  });

  it('un super administrador dentro de una empresa la pierde si le revocan la concesión', async () => {
    repository.findSessionByHash.mockResolvedValue(
      storedSession({
        organizationId: 'org-1',
        actingAsPlatformAdmin: true,
        user: { isPlatformAdmin: false },
      }),
    );

    expect(await getSession()).toBeNull();
    expect(repository.deleteSession).toHaveBeenCalledWith('huella');
  });

  it('sin empresa activa no se consulta ninguna membresía', async () => {
    repository.findSessionByHash.mockResolvedValue(storedSession());

    await getSession();
    expect(repository.findLiveMembershipCompany).not.toHaveBeenCalled();
  });
});

describe('requireCompanySession', () => {
  it('se niega sin empresa activa', async () => {
    repository.findSessionByHash.mockResolvedValue(storedSession());

    await expect(requireCompanySession()).rejects.toThrow(AuthorizationError);
  });

  it('un miembro trabaja con los permisos de sus roles', async () => {
    repository.findSessionByHash.mockResolvedValue(storedSession({ organizationId: 'org-1' }));
    grants('product:read', 'inventory:read');

    const session = await requireCompanySession();
    expect([...session.permissions].sort()).toEqual(['inventory:read', 'product:read']);
  });

  it('un administrador de empresa trabaja sin segundo factor: RN-005 es solo de la plataforma', async () => {
    repository.findSessionByHash.mockResolvedValue(storedSession({ organizationId: 'org-1' }));
    grants('user:update', 'role:update');

    const session = await requireCompanySession();
    expect(session.permissions.has('user:update')).toBe(true);
  });

  it('un super administrador dentro de la empresa tiene todos los permisos de empresa', async () => {
    repository.findSessionByHash.mockResolvedValue(
      storedSession({
        organizationId: 'org-1',
        actingAsPlatformAdmin: true,
        twoFactorVerifiedAt: VERIFIED,
        user: { isPlatformAdmin: true },
      }),
    );

    const session = await requireCompanySession();
    expect(session.permissions.has('user:update')).toBe(true);
    expect(repository.listCompanyPermissions).not.toHaveBeenCalled();
  });

  it('pero sin segundo factor no pasa, igual que en las pantallas de plataforma', async () => {
    repository.findSessionByHash.mockResolvedValue(
      storedSession({
        organizationId: 'org-1',
        actingAsPlatformAdmin: true,
        user: { isPlatformAdmin: true },
      }),
    );

    await expect(requireCompanySession()).rejects.toThrow(TwoFactorRequiredError);
  });
});

describe('requireCompanyPermission', () => {
  beforeEach(() => {
    repository.findSessionByHash.mockResolvedValue(storedSession({ organizationId: 'org-1' }));
  });

  it('rechaza el permiso que el miembro no tiene', async () => {
    await expect(requireCompanyPermission('product:create')).rejects.toThrow(
      AuthorizationError,
    );
  });

  it('deja pasar el que tiene', async () => {
    await expect(requireCompanyPermission('product:read')).resolves.toMatchObject({
      organizationId: 'org-1',
    });
  });

  it('no acepta un permiso de plataforma por la puerta de la empresa', async () => {
    await expect(requireCompanyPermission('platform.organization:read')).rejects.toThrow(
      AuthorizationError,
    );
  });

  it('la variante que responde dice lo mismo', async () => {
    const session = await requireCompanySession();

    expect(holdsCompanyPermission(session, 'product:read')).toBe(true);
    expect(holdsCompanyPermission(session, 'product:create')).toBe(false);
  });
});

describe('authorizeCompanyEntry', () => {
  it('un miembro entra en una empresa suya, sin acceso elevado', async () => {
    await expect(authorizeCompanyEntry(sessionOf(), 'org-1')).resolves.toEqual({
      company: COMPANY,
      actingAsPlatformAdmin: false,
      permissionCode: null,
    });
  });

  it('no entra en una donde no tiene membresía viva, y no se le dice si existe', async () => {
    repository.findLiveMembershipCompany.mockResolvedValue(null);

    await expect(authorizeCompanyEntry(sessionOf(), 'org-2')).rejects.toThrow(NotFoundError);
  });

  it('un administrador de empresa entra sin segundo factor', async () => {
    grants('role:update');

    await expect(authorizeCompanyEntry(sessionOf(), 'org-1')).resolves.toMatchObject({
      company: COMPANY,
      actingAsPlatformAdmin: false,
    });
  });

  it('un super administrador entra como plataforma, aunque además sea miembro', async () => {
    const admin = sessionOf({ isPlatformAdmin: true, twoFactorVerifiedAt: VERIFIED });

    await expect(authorizeCompanyEntry(admin, 'org-1')).resolves.toEqual({
      company: COMPANY,
      actingAsPlatformAdmin: true,
      permissionCode: 'platform.organization:enter',
    });
    expect(repository.findLiveMembershipCompany).not.toHaveBeenCalled();
  });

  it('un super administrador sin segundo factor no entra', async () => {
    await expect(
      authorizeCompanyEntry(sessionOf({ isPlatformAdmin: true }), 'org-1'),
    ).rejects.toThrow(TwoFactorRequiredError);
  });

  it('no entra en una empresa borrada', async () => {
    repository.findEnterableOrganization.mockResolvedValue(null);
    const admin = sessionOf({ isPlatformAdmin: true, twoFactorVerifiedAt: VERIFIED });

    await expect(authorizeCompanyEntry(admin, 'org-1')).rejects.toThrow(NotFoundError);
  });
});

describe('authorizeAutomaticEntry', () => {
  const member = { userId: 'u-1', isPlatformAdmin: false };

  it('quien pertenece a una sola empresa entra en ella', async () => {
    repository.listCompanyChoices.mockResolvedValue([{ organizationId: 'org-1' }]);

    await expect(authorizeAutomaticEntry(member)).resolves.toMatchObject({ company: COMPANY });
  });

  it('con varias tiene que elegir', async () => {
    repository.listCompanyChoices.mockResolvedValue([
      { organizationId: 'org-1' },
      { organizationId: 'org-2' },
    ]);

    await expect(authorizeAutomaticEntry(member)).resolves.toBeNull();
  });

  it('la plataforma nunca entra sola: empieza en su lista', async () => {
    await expect(
      authorizeAutomaticEntry({ ...member, isPlatformAdmin: true }),
    ).resolves.toBeNull();
    expect(repository.listCompanyChoices).not.toHaveBeenCalled();
  });

  it('quien administra su única empresa también entra directo', async () => {
    repository.listCompanyChoices.mockResolvedValue([{ organizationId: 'org-1' }]);
    grants('user:update');

    await expect(authorizeAutomaticEntry(member)).resolves.toMatchObject({ company: COMPANY });
  });
});

describe('requireTwoFactorChallenge (ADR 0014)', () => {
  it('un miembro no llega a las pantallas del segundo factor', async () => {
    repository.findSessionByHash.mockResolvedValue(storedSession());

    await expect(requireTwoFactorChallenge()).rejects.toThrow(AuthorizationError);
  });

  it('un super administrador sin factor superado sí llega: es donde lo supera', async () => {
    repository.findSessionByHash.mockResolvedValue(
      storedSession({ user: { isPlatformAdmin: true } }),
    );

    await expect(requireTwoFactorChallenge()).resolves.toMatchObject({ isPlatformAdmin: true });
  });

  it('sin sesión no llega nadie', async () => {
    repository.findSessionByHash.mockResolvedValue(null);

    await expect(requireTwoFactorChallenge()).rejects.toThrow('No hay sesión activa.');
  });
});

/**
 * Las consultas dentro de una empresa. RN-073, ADR 0015, ADR 0017.
 *
 * Pedir un permiso de consulta es registrarlo, antes de leer, lo pida un miembro
 * o la plataforma. Si el registro falla, la puerta no se abre.
 */
describe('requireCompanyPermission y las consultas', () => {
  const platformInCompany = () =>
    storedSession({
      organizationId: 'org-1',
      actingAsPlatformAdmin: true,
      twoFactorVerifiedAt: VERIFIED,
      user: { isPlatformAdmin: true },
    });

  it('registra la consulta, con la empresa, el recurso y los filtros', async () => {
    repository.findSessionByHash.mockResolvedValue(platformInCompany());

    await requireCompanyPermission('product:read', { filters: { q: 'tornillo', page: 2 } });

    expect(audit.buildAuditContext).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-1', actingAsPlatformAdmin: true }),
      'product:read',
    );
    expect(audit.recordAuditEntriesAlone).toHaveBeenCalledTimes(1);
    expect(audit.recordAuditEntriesAlone).toHaveBeenCalledWith(
      { organizationId: 'org-1', userId: null, actingAsPlatformAdmin: false },
      AUDIT_CONTEXT,
      [
        {
          action: 'company_data.viewed',
          entityType: 'CompanyData',
          entityId: 'org-1',
          entityLabel: 'product',
          organizationId: 'org-1',
          after: { resource: 'product', q: 'tornillo', page: 2 },
        },
      ],
    );
  });

  it('si la bitácora falla, la consulta no se autoriza', async () => {
    repository.findSessionByHash.mockResolvedValue(platformInCompany());
    audit.recordAuditEntriesAlone.mockRejectedValue(new Error('bitácora caída'));

    await expect(requireCompanyPermission('product:read')).rejects.toThrow('bitácora caída');
  });

  it('un permiso que cambia datos no se registra aquí: lo registra su escritura', async () => {
    repository.findSessionByHash.mockResolvedValue(platformInCompany());

    await requireCompanyPermission('product:create');

    expect(audit.recordAuditEntriesAlone).not.toHaveBeenCalled();
  });

  it('un miembro de la empresa que consulta también deja su entrada, sin privilegio', async () => {
    repository.findSessionByHash.mockResolvedValue(storedSession({ organizationId: 'org-1' }));

    await requireCompanyPermission('product:read');

    expect(audit.buildAuditContext).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-1', actingAsPlatformAdmin: false }),
      'product:read',
    );
    expect(audit.recordAuditEntriesAlone).toHaveBeenCalledWith(
      { organizationId: 'org-1', userId: null, actingAsPlatformAdmin: false },
      AUDIT_CONTEXT,
      [expect.objectContaining({ action: 'company_data.viewed', entityLabel: 'product' })],
    );
  });

  it('si la bitácora falla, tampoco un miembro consulta', async () => {
    repository.findSessionByHash.mockResolvedValue(storedSession({ organizationId: 'org-1' }));
    audit.recordAuditEntriesAlone.mockRejectedValue(new Error('bitácora caída'));

    await expect(requireCompanyPermission('product:read')).rejects.toThrow('bitácora caída');
  });

  it('un permiso que falta no llega a registrar nada', async () => {
    repository.findSessionByHash.mockResolvedValue(storedSession({ organizationId: 'org-1' }));

    await expect(requireCompanyPermission('customer:read')).rejects.toThrow(AuthorizationError);
    expect(audit.recordAuditEntriesAlone).not.toHaveBeenCalled();
  });

  it('decidir qué se dibuja no registra nada', async () => {
    repository.findSessionByHash.mockResolvedValue(platformInCompany());

    const session = await requireCompanySession();
    holdsCompanyPermission(session, 'product:read');

    expect(audit.recordAuditEntriesAlone).not.toHaveBeenCalled();
  });
});

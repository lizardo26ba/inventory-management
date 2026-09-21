/**
 * Bitácora de auditoría del prototipo.
 *
 * La forma de cada entrada es la de la tabla real, `audit_logs`, tal como la
 * escribe `src/modules/audit`. Lo único que se añade son el nombre del autor y
 * de la empresa, que la consulta real resolverá uniendo con sus tablas.
 *
 * Tres decisiones que conviene ver reflejadas aquí:
 *
 * - La acción es un código del catálogo real. Su nombre vive en `src/lib/i18n`,
 *   que es lo único que el prototipo comparte con la aplicación, y una prueba
 *   compara esas claves con el catálogo. El prototipo no puede inventar una
 *   acción que el sistema no registra.
 * - El antes y el después son dos objetos con solo los campos que cambiaron,
 *   igual que en la base. La tabla del detalle los junta campo a campo.
 * - Una operación puede dejar varias entradas con la misma correlación: crear
 *   una cuenta deja la cuenta y cada acceso que se le concedió.
 *
 * Los valores son los que escriben los repositorios reales. Las fechas son
 * fijas, no relativas a hoy, para que dos personas mirando el prototipo vean lo
 * mismo. RN-070 a RN-073.
 */

import { type PermissionCode } from '@/lib/auth/permissions';
import { type Copy } from '@/lib/i18n';

export type AuditActionCode = keyof Copy['auditActions'];

export type AuditEntityType = 'Organization' | 'User' | 'Membership' | 'PlatformAdmin';

/** Un valor de la bitácora. Los instantes llegan como texto ISO. */
export type AuditValue = string | number | boolean | null;

export type AuditFields = Readonly<Record<string, AuditValue>>;

export type AuditActor = {
  readonly name: string;
  readonly email: string;
};

export type AuditEntry = {
  readonly id: string;
  readonly createdAt: string;
  readonly action: AuditActionCode;
  readonly entityType: AuditEntityType;
  readonly entityId: string;
  /** Cómo se llamaba la entidad en ese momento. */
  readonly entityLabel: string | null;
  /** La empresa afectada. Nula en lo que es de plataforma. */
  readonly organizationId: string | null;
  readonly organizationName: string | null;
  /** Nulo cuando nadie había iniciado sesión: el bloqueo por intentos. */
  readonly actor: AuditActor | null;
  /** Permiso de plataforma o super administrador en empresa ajena. RN-072. */
  readonly actingAsPlatformAdmin: boolean;
  readonly permissionCode: PermissionCode | null;
  readonly before: AuditFields | null;
  readonly after: AuditFields | null;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  /** Enlaza las entradas que salieron de la misma operación. */
  readonly correlationId: string;
};

/** Un campo que cambió, con sus dos valores. */
export type AuditChangeRow = {
  readonly field: string;
  readonly before: AuditValue;
  readonly after: AuditValue;
};

/**
 * Junta el antes y el después campo a campo.
 *
 * Un campo que falta en un lado vale nulo, que es lo que era: al crear no hay
 * antes, y al retirar un acceso el después no tiene rol.
 */
export function toChangeRows(
  before: AuditFields | null,
  after: AuditFields | null,
): AuditChangeRow[] {
  const fields = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];

  return fields.map((field) => ({
    field,
    before: before?.[field] ?? null,
    after: after?.[field] ?? null,
  }));
}

// -----------------------------------------------------------------------------
// Datos inventados. Correos de example.com y direcciones de los rangos
// reservados para documentación: nada de esto es de nadie.
// -----------------------------------------------------------------------------

type Session = {
  readonly actor: AuditActor;
  readonly ipAddress: string;
  readonly userAgent: string;
};

const SOFIA: Session = {
  actor: { name: 'Sofía Cabrera', email: 'sofia.cabrera@example.com' },
  ipAddress: '203.0.113.24',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0',
};

const DIEGO: Session = {
  actor: { name: 'Diego Ramírez', email: 'diego.ramirez@example.com' },
  ipAddress: '198.51.100.77',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) Safari/18.0',
};

const LUIS: Session = {
  actor: { name: 'Luis Herrera', email: 'luis.herrera@example.com' },
  ipAddress: '203.0.113.31',
  userAgent: 'Mozilla/5.0 (Linux; Android 15) Chrome/140.0 Mobile',
};

const COMPANIES = {
  central: { id: 'c-01', name: 'Distribuidora Central' },
  sur: { id: 'c-02', name: 'Almacenes del Sur' },
  altos: { id: 'c-03', name: 'Farmacia Los Altos' },
  progreso: { id: 'c-04', name: 'Ferretería El Progreso' },
  bajio: { id: 'c-15', name: 'Abarrotes del Bajío' },
  puebla: { id: 'c-18', name: 'Insumos Médicos Puebla' },
} as const;

type Company = (typeof COMPANIES)[keyof typeof COMPANIES];

/** Mismo tope y misma duración que el servicio de autenticación. */
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const MILLISECONDS_PER_MINUTE = 60_000;

/** Un valor que depende del instante de la operación, como una fecha de borrado. */
type FieldsAt = AuditFields | null | ((at: Date) => AuditFields);

type EntryTemplate = {
  readonly session: Session | null;
  readonly action: AuditActionCode;
  readonly entityType: AuditEntityType;
  readonly entityId: string;
  readonly entityLabel: string | null;
  readonly company: Company | null;
  readonly permissionCode: PermissionCode | null;
  readonly before?: FieldsAt;
  readonly after?: FieldsAt;
};

/** Varias entradas que salen de la misma operación y comparten correlación. */
type OperationTemplate = readonly EntryTemplate[];

/**
 * Todo lo que hoy puede hacer una persona pasa por un permiso de plataforma, así
 * que todas las escrituras salen elevadas. Solo los sucesos de sesión, que no
 * piden permiso, no lo están. Así es también en el sistema real.
 */
function entry(
  session: Session | null,
  permissionCode: PermissionCode | null,
  rest: Omit<EntryTemplate, 'session' | 'permissionCode'>,
): EntryTemplate {
  return { session, permissionCode, ...rest };
}

const OPERATIONS: readonly OperationTemplate[] = [
  [
    entry(SOFIA, null, {
      action: 'auth.signed_in',
      entityType: 'User',
      entityId: 'u-sofia',
      entityLabel: SOFIA.actor.email,
      company: null,
    }),
  ],
  [
    entry(SOFIA, 'platform.organization:create', {
      action: 'organization.created',
      entityType: 'Organization',
      entityId: COMPANIES.bajio.id,
      entityLabel: COMPANIES.bajio.name,
      company: COMPANIES.bajio,
      after: {
        slug: 'abarrotes-del-bajio',
        name: COMPANIES.bajio.name,
        legalName: 'Abarrotes del Bajío, S.A. de C.V.',
        countryCode: 'MX',
        baseCurrencyCode: 'MXN',
        timeZone: 'America/Mexico_City',
        taxId: null,
        email: null,
        phone: '+52 442 555 0134',
        address: null,
      },
    }),
  ],
  [
    entry(DIEGO, 'platform.organization:update', {
      action: 'organization.updated',
      entityType: 'Organization',
      entityId: COMPANIES.central.id,
      entityLabel: COMPANIES.central.name,
      company: COMPANIES.central,
      before: { phone: '+502 2200 1100', email: null },
      after: { phone: '+502 2200 1188', email: 'compras@distribuidora-central.example.com' },
    }),
  ],
  [
    entry(SOFIA, 'platform.user:create', {
      action: 'user.created',
      entityType: 'User',
      entityId: 'u-luis',
      entityLabel: LUIS.actor.email,
      company: null,
      after: {
        email: LUIS.actor.email,
        firstName: 'Luis',
        lastName: 'Herrera',
        countryCode: 'GT',
        status: 'ACTIVE',
        mustChangePassword: true,
      },
    }),
    entry(SOFIA, 'platform.user:create', {
      action: 'membership.granted',
      entityType: 'Membership',
      entityId: 'm-luis-central',
      entityLabel: LUIS.actor.email,
      company: COMPANIES.central,
      before: { role: null },
      after: { role: 'Ventas' },
    }),
  ],
  [
    entry(LUIS, null, {
      action: 'auth.signed_in',
      entityType: 'User',
      entityId: 'u-luis',
      entityLabel: LUIS.actor.email,
      company: null,
    }),
  ],
  [
    entry(LUIS, null, {
      action: 'auth.password_changed',
      entityType: 'User',
      entityId: 'u-luis',
      entityLabel: LUIS.actor.email,
      company: null,
    }),
  ],
  [
    entry(DIEGO, 'platform.user:update', {
      action: 'user.updated',
      entityType: 'User',
      entityId: 'u-ana',
      entityLabel: 'ana.morales@example.com',
      company: null,
      before: { lastName: 'Morales' },
      after: { lastName: 'Morales Pérez' },
    }),
    entry(DIEGO, 'platform.user:update', {
      action: 'membership.role_changed',
      entityType: 'Membership',
      entityId: 'm-ana-sur',
      entityLabel: 'ana.morales@example.com',
      company: COMPANIES.sur,
      before: { role: 'Bodega' },
      after: { role: 'Compras' },
    }),
    entry(DIEGO, 'platform.user:update', {
      action: 'membership.revoked',
      entityType: 'Membership',
      entityId: 'm-ana-puebla',
      entityLabel: 'ana.morales@example.com',
      company: COMPANIES.puebla,
      before: { role: 'Consulta' },
      after: { role: null },
    }),
  ],
  [
    entry(SOFIA, 'platform.organization:suspend', {
      action: 'organization.deactivated',
      entityType: 'Organization',
      entityId: COMPANIES.altos.id,
      entityLabel: COMPANIES.altos.name,
      company: COMPANIES.altos,
      before: { isActive: true },
      after: { isActive: false },
    }),
  ],
  [
    // Nadie había iniciado sesión: el intento que bloquea no tiene autor.
    entry(null, null, {
      action: 'auth.locked_out',
      entityType: 'User',
      entityId: 'u-jorge',
      entityLabel: 'jorge.lopez@example.com',
      company: null,
      after: (at) => ({
        failedLoginAttempts: MAX_FAILED_ATTEMPTS,
        lockedUntil: new Date(
          at.getTime() + LOCKOUT_MINUTES * MILLISECONDS_PER_MINUTE,
        ).toISOString(),
      }),
    }),
  ],
  [
    entry(SOFIA, 'platform.admin:grant', {
      action: 'platform_admin.granted',
      entityType: 'PlatformAdmin',
      entityId: 'pa-diego',
      entityLabel: DIEGO.actor.email,
      company: null,
      after: { reason: 'Soporte de primer nivel para las empresas de México.' },
    }),
  ],
  [
    entry(DIEGO, 'platform.user:suspend', {
      action: 'user.deactivated',
      entityType: 'User',
      entityId: 'u-jorge',
      entityLabel: 'jorge.lopez@example.com',
      company: null,
      before: { status: 'ACTIVE' },
      after: { status: 'SUSPENDED' },
    }),
  ],
  [
    entry(SOFIA, 'platform.organization:suspend', {
      action: 'organization.activated',
      entityType: 'Organization',
      entityId: COMPANIES.altos.id,
      entityLabel: COMPANIES.altos.name,
      company: COMPANIES.altos,
      before: { isActive: false },
      after: { isActive: true },
    }),
  ],
  [
    entry(SOFIA, 'platform.user:delete', {
      action: 'user.deleted',
      entityType: 'User',
      entityId: 'u-jorge',
      entityLabel: 'jorge.lopez@example.com',
      company: null,
      before: { status: 'SUSPENDED', deletedAt: null },
      after: (at) => ({ status: 'SUSPENDED', deletedAt: at.toISOString() }),
    }),
    entry(SOFIA, 'platform.user:delete', {
      action: 'membership.revoked',
      entityType: 'Membership',
      entityId: 'm-jorge-puebla',
      entityLabel: 'jorge.lopez@example.com',
      company: COMPANIES.puebla,
      before: { role: 'Bodega' },
      after: { role: null },
    }),
  ],
  [
    entry(SOFIA, 'platform.admin:revoke', {
      action: 'platform_admin.revoked',
      entityType: 'PlatformAdmin',
      entityId: 'pa-marta',
      entityLabel: 'marta.soto@example.com',
      company: null,
      before: { granted: true },
      after: { granted: false },
    }),
  ],
  [
    entry(DIEGO, 'platform.user:suspend', {
      action: 'user.activated',
      entityType: 'User',
      entityId: 'u-luis',
      entityLabel: LUIS.actor.email,
      company: null,
      before: { status: 'SUSPENDED' },
      after: { status: 'ACTIVE' },
    }),
  ],
  [
    entry(SOFIA, 'platform.organization:delete', {
      action: 'organization.deleted',
      entityType: 'Organization',
      entityId: COMPANIES.progreso.id,
      entityLabel: COMPANIES.progreso.name,
      company: COMPANIES.progreso,
      before: { isActive: true, deletedAt: null },
      after: (at) => ({ isActive: false, deletedAt: at.toISOString() }),
    }),
  ],
];

/**
 * Lo que dice la tabla real de un permiso: elevado si es de plataforma. Aquí
 * basta el prefijo, porque todos los permisos de plataforma lo llevan.
 */
function isPlatformPermission(code: PermissionCode | null): boolean {
  return code !== null && code.startsWith('platform.');
}

function resolve(fields: FieldsAt | undefined, at: Date): AuditFields | null {
  if (fields === undefined || fields === null) return null;
  return typeof fields === 'function' ? fields(at) : fields;
}

const FIRST_OPERATION = Date.UTC(2026, 8, 1, 8, 12);
const MINUTES_BETWEEN_OPERATIONS = 97;
const OPERATION_COUNT = 32;

export const auditEntries: readonly AuditEntry[] = Array.from(
  { length: OPERATION_COUNT },
  (_unused, operationIndex) => {
    const templates = OPERATIONS[operationIndex % OPERATIONS.length] ?? [];
    const at = new Date(
      FIRST_OPERATION + operationIndex * MINUTES_BETWEEN_OPERATIONS * MILLISECONDS_PER_MINUTE,
    );
    // Una por operación, no por entrada: es lo que convierte una lista suelta en
    // una historia reconstruible.
    const correlationId = `op-${String(operationIndex + 1).padStart(4, '0')}-9f4b`;

    return templates.map((template, entryIndex): AuditEntry => ({
      id: `a-${String(operationIndex + 1).padStart(4, '0')}-${entryIndex + 1}`,
      createdAt: at.toISOString(),
      action: template.action,
      entityType: template.entityType,
      entityId: template.entityId,
      entityLabel: template.entityLabel,
      organizationId: template.company?.id ?? null,
      organizationName: template.company?.name ?? null,
      actor: template.session?.actor ?? null,
      actingAsPlatformAdmin: isPlatformPermission(template.permissionCode),
      permissionCode: template.permissionCode,
      before: resolve(template.before, at),
      after: resolve(template.after, at),
      ipAddress: template.session?.ipAddress ?? '198.51.100.203',
      userAgent: template.session?.userAgent ?? 'curl/8.9',
      correlationId,
    }));
  },
).flat();

/** Las empresas que aparecen en la bitácora, para el filtro. */
export const auditCompanies: readonly { readonly id: string; readonly name: string }[] =
  Object.values(COMPANIES);

/** Una página de la bitácora y las fronteras para moverse desde ella. */
export type AuditEntryPage = {
  readonly items: readonly AuditEntry[];
  /** La primera fila, si hay algo más reciente que ella. */
  readonly newerCursor: string | null;
  /** La última fila, si hay algo más antiguo que ella. */
  readonly olderCursor: string | null;
};

/** De lo más reciente a lo más antiguo. El identificador desempata el mismo instante. */
function newestFirst(left: AuditEntry, right: AuditEntry): number {
  if (left.createdAt !== right.createdAt) return left.createdAt < right.createdAt ? 1 : -1;
  if (left.id === right.id) return 0;
  return left.id < right.id ? 1 : -1;
}

/**
 * Lo que hará la consulta real sobre `(created_at, id)`: ordenar de lo más
 * reciente a lo más antiguo y cortar desde la fila frontera, sin contar nada.
 *
 * Varias entradas de una misma operación comparten instante, así que el
 * identificador desempata. Sin él, una fila podría caer a la vez al final de una
 * página y al principio de la siguiente.
 *
 * Un cursor que no está en el resultado, porque se escribió a mano o se cambió un
 * filtro, vuelve a lo más reciente en lugar de dejar la tabla vacía.
 */
export function pageAuditEntries(
  entries: readonly AuditEntry[],
  cursor: { readonly older: string | null; readonly newer: string | null },
  pageSize: number,
): AuditEntryPage {
  const sorted = [...entries].sort(newestFirst);

  const olderIndex = sorted.findIndex((candidate) => candidate.id === cursor.older);
  const newerIndex = sorted.findIndex((candidate) => candidate.id === cursor.newer);

  let start = 0;
  if (olderIndex >= 0) start = olderIndex + 1;
  else if (newerIndex >= 0) start = Math.max(0, newerIndex - pageSize);

  const items = sorted.slice(start, start + pageSize);
  const first = items[0];
  const last = items[items.length - 1];

  return {
    items,
    newerCursor: start > 0 && first !== undefined ? first.id : null,
    olderCursor: start + pageSize < sorted.length && last !== undefined ? last.id : null,
  };
}

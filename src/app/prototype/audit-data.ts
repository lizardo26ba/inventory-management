/**
 * Bitácora de auditoría del prototipo.
 *
 * La forma de cada entrada es la que se propuso y la que tendrá la tabla real:
 * qué ocurrió, quién lo hizo, sobre qué, en qué empresa, con qué privilegio,
 * desde dónde, y con qué identificador de correlación.
 *
 * Dos decisiones que conviene ver reflejadas aquí:
 *
 * - La acción es un hecho de negocio con nombre propio, no una operación de
 *   base de datos. Se busca por lo que pasó, no por qué tabla se tocó.
 * - El antes y después guarda solo los campos que cambiaron. La fila entera
 *   esconde el cambio real entre treinta valores iguales.
 *
 * Las entradas se generan combinando plantillas para que haya volumen sin
 * escribir cuarenta literales. Las fechas son fijas, no relativas a hoy, para
 * que dos personas mirando el prototipo vean lo mismo. RN-070 a RN-074.
 */

export type AuditCategory = 'inventory' | 'access' | 'masterData' | 'platform';

export type AuditAction = {
  readonly code: string;
  readonly label: string;
  readonly category: AuditCategory;
};

export const auditActions: readonly AuditAction[] = [
  { code: 'stock.entry_registered', label: 'Stock entry registered', category: 'inventory' },
  { code: 'stock.exit_registered', label: 'Stock exit registered', category: 'inventory' },
  { code: 'stock.adjusted', label: 'Stock adjusted', category: 'inventory' },
  { code: 'purchase.received', label: 'Purchase received', category: 'inventory' },
  { code: 'sale.confirmed', label: 'Sale confirmed', category: 'inventory' },
  { code: 'user.role_granted', label: 'Role granted', category: 'access' },
  { code: 'user.role_revoked', label: 'Role revoked', category: 'access' },
  { code: 'user.deactivated', label: 'User deactivated', category: 'access' },
  { code: 'product.updated', label: 'Product updated', category: 'masterData' },
  { code: 'company.created', label: 'Company created', category: 'masterData' },
  { code: 'company.deactivated', label: 'Company deactivated', category: 'masterData' },
  { code: 'platform.company_viewed', label: 'Company data viewed', category: 'platform' },
];

export function findAuditAction(code: string): AuditAction | undefined {
  return auditActions.find((action) => action.code === code);
}

/** Un campo que cambió, con sus dos valores. Nunca la fila entera. */
export type AuditChange = {
  readonly field: string;
  readonly before: string | null;
  readonly after: string | null;
};

export type AuditEntry = {
  readonly id: string;
  readonly createdAt: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityLabel: string;
  readonly companyId: string | null;
  readonly companyName: string | null;
  readonly actorName: string;
  readonly actorEmail: string;
  /** Ejecutada con privilegio de plataforma, por encima de la empresa. RN-072. */
  readonly elevated: boolean;
  readonly ipAddress: string;
  readonly correlationId: string;
  readonly changes: readonly AuditChange[];
};

type EntryTemplate = Omit<AuditEntry, 'id' | 'createdAt' | 'correlationId'>;

const ACTORS = [
  { name: 'Ana Morales', email: 'ana.morales@example.com', ip: '190.56.10.24' },
  { name: 'Luis Herrera', email: 'luis.herrera@example.com', ip: '190.56.10.31' },
  { name: 'Sofia Cabrera', email: 'sofia.cabrera@example.com', ip: '181.174.22.9' },
  { name: 'Diego Ramirez', email: 'diego.ramirez@example.com', ip: '187.190.4.77' },
  { name: 'Platform admin', email: 'admin@gt.com', ip: '190.56.10.2' },
] as const;

const TEMPLATES: readonly EntryTemplate[] = [
  {
    action: 'stock.entry_registered',
    entityType: 'StockMovement',
    entityLabel: 'MOV-GT-004181',
    companyId: 'c-01',
    companyName: 'Distribuidora Central',
    actorName: ACTORS[0].name,
    actorEmail: ACTORS[0].email,
    elevated: false,
    ipAddress: ACTORS[0].ip,
    changes: [
      { field: 'quantity', before: null, after: '400 box' },
      { field: 'product', before: null, after: 'Nitrile gloves, size M, box of 100' },
      { field: 'warehouse', before: null, after: 'Main warehouse' },
    ],
  },
  {
    action: 'sale.confirmed',
    entityType: 'SalesOrder',
    entityLabel: 'SO-GT-000971',
    companyId: 'c-01',
    companyName: 'Distribuidora Central',
    actorName: ACTORS[1].name,
    actorEmail: ACTORS[1].email,
    elevated: false,
    ipAddress: ACTORS[1].ip,
    changes: [
      { field: 'status', before: 'DRAFT', after: 'CONFIRMED' },
      { field: 'total', before: null, after: 'GTQ 2,310.00' },
    ],
  },
  {
    action: 'stock.adjusted',
    entityType: 'StockMovement',
    entityLabel: 'ADJ-GT-000019',
    companyId: 'c-02',
    companyName: 'Almacenes del Sur',
    actorName: ACTORS[2].name,
    actorEmail: ACTORS[2].email,
    elevated: false,
    ipAddress: ACTORS[2].ip,
    changes: [
      { field: 'quantity', before: '100 box', after: '95 box' },
      { field: 'reason', before: null, after: 'Damaged in transit' },
    ],
  },
  {
    action: 'user.role_granted',
    entityType: 'Membership',
    entityLabel: 'luis.herrera@example.com',
    companyId: 'c-01',
    companyName: 'Distribuidora Central',
    actorName: ACTORS[0].name,
    actorEmail: ACTORS[0].email,
    elevated: false,
    ipAddress: ACTORS[0].ip,
    changes: [{ field: 'role', before: null, after: 'Sales' }],
  },
  {
    action: 'user.role_revoked',
    entityType: 'Membership',
    entityLabel: 'jorge.lopez@example.com',
    companyId: 'c-18',
    companyName: 'Insumos Medicos Puebla',
    actorName: ACTORS[3].name,
    actorEmail: ACTORS[3].email,
    elevated: false,
    ipAddress: ACTORS[3].ip,
    changes: [{ field: 'role', before: 'Warehouse', after: null }],
  },
  {
    action: 'product.updated',
    entityType: 'Product',
    entityLabel: 'MED-0207',
    companyId: 'c-01',
    companyName: 'Distribuidora Central',
    actorName: ACTORS[0].name,
    actorEmail: ACTORS[0].email,
    elevated: false,
    ipAddress: ACTORS[0].ip,
    changes: [
      { field: 'minimumLevel', before: '120', after: '150' },
      { field: 'trackingMode', before: 'NONE', after: 'LOT' },
    ],
  },
  {
    action: 'purchase.received',
    entityType: 'PurchaseOrder',
    entityLabel: 'PO-GT-000184',
    companyId: 'c-04',
    companyName: 'Ferreteria El Progreso',
    actorName: ACTORS[2].name,
    actorEmail: ACTORS[2].email,
    elevated: false,
    ipAddress: ACTORS[2].ip,
    changes: [
      { field: 'status', before: 'CONFIRMED', after: 'RECEIVED' },
      { field: 'quantityReceived', before: '0', after: '400' },
    ],
  },
  {
    action: 'company.created',
    entityType: 'Company',
    entityLabel: 'Abarrotes del Bajio',
    companyId: 'c-15',
    companyName: 'Abarrotes del Bajio',
    actorName: ACTORS[4].name,
    actorEmail: ACTORS[4].email,
    elevated: true,
    ipAddress: ACTORS[4].ip,
    changes: [
      { field: 'countryCode', before: null, after: 'MX' },
      { field: 'baseCurrency', before: null, after: 'MXN' },
    ],
  },
  {
    action: 'company.deactivated',
    entityType: 'Company',
    entityLabel: 'Farmacia Los Altos',
    companyId: 'c-03',
    companyName: 'Farmacia Los Altos',
    actorName: ACTORS[4].name,
    actorEmail: ACTORS[4].email,
    elevated: true,
    ipAddress: ACTORS[4].ip,
    changes: [{ field: 'active', before: 'true', after: 'false' }],
  },
  {
    action: 'platform.company_viewed',
    entityType: 'Company',
    entityLabel: 'Farmacias Monterrey',
    companyId: 'c-16',
    companyName: 'Farmacias Monterrey',
    actorName: ACTORS[4].name,
    actorEmail: ACTORS[4].email,
    elevated: true,
    ipAddress: ACTORS[4].ip,
    // Una consulta no cambia nada. Se registra igual porque la hizo el
    // administrador de plataforma dentro de una empresa ajena. RN-073.
    changes: [],
  },
  {
    action: 'stock.exit_registered',
    entityType: 'StockMovement',
    entityLabel: 'MOV-MX-001042',
    companyId: 'c-16',
    companyName: 'Farmacias Monterrey',
    actorName: ACTORS[3].name,
    actorEmail: ACTORS[3].email,
    elevated: false,
    ipAddress: ACTORS[3].ip,
    changes: [
      { field: 'quantity', before: null, after: '60 box' },
      { field: 'product', before: null, after: 'Amoxicillin 500 mg, box of 21' },
    ],
  },
  {
    action: 'user.deactivated',
    entityType: 'User',
    entityLabel: 'jorge.lopez@example.com',
    companyId: null,
    companyName: null,
    actorName: ACTORS[4].name,
    actorEmail: ACTORS[4].email,
    elevated: true,
    ipAddress: ACTORS[4].ip,
    changes: [{ field: 'active', before: 'true', after: 'false' }],
  },
];

const FIRST_ENTRY = Date.UTC(2026, 8, 1, 8, 12);
const MINUTES_BETWEEN_ENTRIES = 97;
const MILLISECONDS_PER_MINUTE = 60_000;
const ENTRY_COUNT = 48;

export const auditEntries: readonly AuditEntry[] = Array.from(
  { length: ENTRY_COUNT },
  (_unused, index) => {
    const template = TEMPLATES[index % TEMPLATES.length] as EntryTemplate;
    const at = FIRST_ENTRY + index * MINUTES_BETWEEN_ENTRIES * MILLISECONDS_PER_MINUTE;
    const sequence = String(index + 1).padStart(4, '0');
    return {
      ...template,
      id: `a-${sequence}`,
      createdAt: new Date(at).toISOString(),
      // Enlaza todas las entradas de una misma petición. Es lo que convierte
      // una lista suelta en una historia reconstruible.
      correlationId: `req_${sequence}${String(index % TEMPLATES.length)}f4b`,
    };
  },
);

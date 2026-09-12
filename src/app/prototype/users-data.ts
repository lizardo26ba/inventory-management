/**
 * Usuarios, roles y permisos del prototipo.
 *
 * Un permiso es lo que se puede hacer. Un rol es un puñado de permisos con
 * nombre, para no repartirlos de uno en uno. El acceso de una persona a una
 * empresa pasa siempre por un rol: así, cambiar lo que puede hacer el área de
 * compras se hace una vez, y no persona por persona.
 *
 * Una persona no pertenece a una empresa, pertenece a varias. Por eso el acceso
 * es una lista de pares empresa y rol, y no un campo dentro del usuario.
 *
 * Los códigos son los que viajarán a la base de datos. Las etiquetas son texto
 * de interfaz y pasarán al catálogo de traducciones.
 */

export type Permission = {
  readonly code: string;
  readonly label: string;
};

export type PermissionGroup = {
  readonly code: string;
  readonly label: string;
  readonly permissions: readonly Permission[];
};

export const permissionGroups: readonly PermissionGroup[] = [
  {
    code: 'catalog',
    label: 'Catalog',
    permissions: [
      { code: 'product.read', label: 'View products' },
      { code: 'product.write', label: 'Create and edit products' },
      { code: 'warehouse.read', label: 'View warehouses' },
      { code: 'warehouse.write', label: 'Create and edit warehouses' },
    ],
  },
  {
    code: 'stock',
    label: 'Stock',
    permissions: [
      { code: 'stock.read', label: 'View stock' },
      { code: 'stock.entry', label: 'Register entries' },
      { code: 'stock.exit', label: 'Register exits' },
      { code: 'stock.adjust', label: 'Adjust stock' },
    ],
  },
  {
    code: 'purchasing',
    label: 'Purchases',
    permissions: [
      { code: 'purchase.read', label: 'View purchase orders' },
      { code: 'purchase.write', label: 'Create purchase orders' },
      { code: 'purchase.receive', label: 'Receive goods' },
    ],
  },
  {
    code: 'selling',
    label: 'Sales',
    permissions: [
      { code: 'sale.read', label: 'View sales orders' },
      { code: 'sale.write', label: 'Create sales orders' },
      { code: 'sale.confirm', label: 'Confirm and dispatch' },
    ],
  },
  {
    code: 'administration',
    label: 'Administration',
    permissions: [
      { code: 'user.read', label: 'View users' },
      { code: 'user.write', label: 'Invite and edit users' },
      { code: 'audit.read', label: 'Read the audit log' },
    ],
  },
];

export const allPermissionCodes: readonly string[] = permissionGroups.flatMap((group) =>
  group.permissions.map((permission) => permission.code),
);

export type Role = {
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly permissions: readonly string[];
};

export const roles: readonly Role[] = [
  {
    code: 'admin',
    name: 'Company administrator',
    description: 'Everything inside this company, including its users.',
    permissions: allPermissionCodes,
  },
  {
    code: 'purchasing',
    name: 'Purchasing',
    description: 'Buys goods and receives them.',
    permissions: [
      'product.read',
      'warehouse.read',
      'stock.read',
      'stock.entry',
      'purchase.read',
      'purchase.write',
      'purchase.receive',
    ],
  },
  {
    code: 'sales',
    name: 'Sales',
    description: 'Sells and dispatches.',
    permissions: [
      'product.read',
      'warehouse.read',
      'stock.read',
      'stock.exit',
      'sale.read',
      'sale.write',
      'sale.confirm',
    ],
  },
  {
    code: 'warehouse',
    name: 'Warehouse',
    description: 'Moves and counts stock.',
    permissions: [
      'product.read',
      'warehouse.read',
      'warehouse.write',
      'stock.read',
      'stock.entry',
      'stock.exit',
      'stock.adjust',
      'purchase.receive',
    ],
  },
  {
    code: 'viewer',
    name: 'Read only',
    description: 'Looks, never changes.',
    permissions: ['product.read', 'warehouse.read', 'stock.read', 'purchase.read', 'sale.read'],
  },
];

export function findRole(code: string): Role | undefined {
  return roles.find((role) => role.code === code);
}

/** Acceso de una persona a una empresa, siempre a través de un rol. */
export type Membership = {
  readonly companyId: string;
  readonly roleCode: string;
};

export type User = {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly countryCode: string;
  readonly active: boolean;
  readonly createdAt: string;
  readonly memberships: readonly Membership[];
  /** Retrato, guardado como dato incrustado. Ver el comentario del formulario. */
  readonly photoDataUrl?: string;
  /**
   * Acceso de plataforma, por encima de todas las empresas. No es un rol: no se
   * concede dentro de una empresa y no aparece en la lista de accesos.
   */
  readonly isPlatformAdmin?: boolean;
  /** Por qué se concedió. Obligatorio: sirve en la revisión periódica. */
  readonly platformAdminReason?: string;
};

const SEED_USERS_BASE = [
  {
    firstName: 'Ana',
    lastName: 'Morales',
    email: 'ana.morales@example.com',
    countryCode: 'GT',
    active: true,
    isPlatformAdmin: true,
    platformAdminReason: 'Responsable de la operación de la plataforma.',
    memberships: [
      { companyId: 'c-01', roleCode: 'admin' },
      { companyId: 'c-02', roleCode: 'warehouse' },
    ],
  },
  {
    firstName: 'Luis',
    lastName: 'Herrera',
    email: 'luis.herrera@example.com',
    countryCode: 'GT',
    active: true,
    memberships: [{ companyId: 'c-01', roleCode: 'sales' }],
  },
  {
    firstName: 'Sofia',
    lastName: 'Cabrera',
    email: 'sofia.cabrera@example.com',
    countryCode: 'GT',
    active: true,
    memberships: [
      { companyId: 'c-04', roleCode: 'purchasing' },
      { companyId: 'c-07', roleCode: 'purchasing' },
    ],
  },
  {
    firstName: 'Diego',
    lastName: 'Ramirez',
    email: 'diego.ramirez@example.com',
    countryCode: 'MX',
    active: true,
    memberships: [{ companyId: 'c-15', roleCode: 'admin' }],
  },
  {
    firstName: 'Carmen',
    lastName: 'Vazquez',
    email: 'carmen.vazquez@example.com',
    countryCode: 'MX',
    active: true,
    memberships: [
      { companyId: 'c-16', roleCode: 'sales' },
      { companyId: 'c-17', roleCode: 'sales' },
      { companyId: 'c-22', roleCode: 'viewer' },
    ],
  },
  {
    firstName: 'Jorge',
    lastName: 'Lopez',
    email: 'jorge.lopez@example.com',
    countryCode: 'MX',
    active: false,
    memberships: [{ companyId: 'c-18', roleCode: 'warehouse' }],
  },
  {
    firstName: 'Patricia',
    lastName: 'Solis',
    email: 'patricia.solis@example.com',
    countryCode: 'GT',
    active: true,
    memberships: [{ companyId: 'c-06', roleCode: 'viewer' }],
  },
  {
    firstName: 'Ricardo',
    lastName: 'Mendez',
    email: 'ricardo.mendez@example.com',
    countryCode: 'GT',
    active: true,
    memberships: [
      { companyId: 'c-10', roleCode: 'admin' },
      { companyId: 'c-13', roleCode: 'admin' },
    ],
  },
];

const SEED_FIRST_USER_CREATION = Date.UTC(2024, 1, 5);
const DAYS_BETWEEN_SEED_USERS = 19;
const MILLISECONDS_PER_DAY = 86_400_000;

export const users: readonly User[] = SEED_USERS_BASE.map((user, index) => ({
  ...user,
  id: `u-${String(index + 1).padStart(2, '0')}`,
  createdAt: new Date(
    SEED_FIRST_USER_CREATION + index * DAYS_BETWEEN_SEED_USERS * MILLISECONDS_PER_DAY,
  ).toISOString(),
}));

/** Los permisos efectivos de una persona son la unión de los de sus roles. */
export function effectivePermissions(memberships: readonly Membership[]): ReadonlySet<string> {
  const granted = new Set<string>();
  for (const membership of memberships) {
    for (const code of findRole(membership.roleCode)?.permissions ?? []) {
      granted.add(code);
    }
  }
  return granted;
}

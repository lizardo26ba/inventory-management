/**
 * Catálogo único de permisos del sistema.
 *
 * Esta es la fuente de verdad. La semilla inserta exactamente estas filas y el
 * código de autorización solo acepta códigos declarados aquí, así que pedir un
 * permiso inexistente falla al compilar y no en producción.
 *
 * Formato del código: `recurso:accion`.
 * Los permisos de plataforma llevan el recurso prefijado con `platform.` y solo
 * los obtiene un super administrador. Nunca se asignan a un rol de empresa.
 *
 * Ver ADR 0005 y `docs/architecture/reglas-de-negocio.md`.
 */

export const PERMISSION_SCOPES = ['ORGANIZATION', 'PLATFORM'] as const;
export type PermissionScope = (typeof PERMISSION_SCOPES)[number];

export interface PermissionDefinition {
  readonly code: string;
  readonly resource: string;
  readonly action: string;
  readonly scope: PermissionScope;
  readonly description: string;
}

function define(
  resource: string,
  action: string,
  scope: PermissionScope,
  description: string,
): PermissionDefinition {
  return { code: `${resource}:${action}`, resource, action, scope, description };
}

const platform = (action: string, resource: string, description: string) =>
  define(`platform.${resource}`, action, 'PLATFORM', description);

const org = (resource: string, action: string, description: string) =>
  define(resource, action, 'ORGANIZATION', description);

export const PERMISSIONS = [
  // --- Plataforma. Solo el super administrador. ---------------------------
  platform('create', 'organization', 'Crear empresas'),
  platform('read', 'organization', 'Ver la lista de todas las empresas'),
  platform('update', 'organization', 'Editar los datos de cualquier empresa'),
  platform('suspend', 'organization', 'Suspender o reactivar una empresa'),
  platform('enter', 'organization', 'Entrar a una empresa de la que no se es miembro'),
  platform('grant', 'admin', 'Conceder el privilegio de super administrador'),
  platform('revoke', 'admin', 'Revocar el privilegio de super administrador'),
  platform('read', 'audit', 'Consultar la bitácora de auditoría de toda la plataforma'),

  // --- Empresa -------------------------------------------------------------
  org('organization', 'read', 'Ver los datos de la empresa'),
  org('organization', 'update', 'Editar los datos de la empresa'),

  org('user', 'read', 'Ver los usuarios de la empresa'),
  org('user', 'invite', 'Invitar usuarios a la empresa'),
  org('user', 'update', 'Editar usuarios y sus roles'),
  org('user', 'suspend', 'Suspender el acceso de un usuario'),

  org('role', 'read', 'Ver los roles y sus permisos'),
  org('role', 'create', 'Crear roles'),
  org('role', 'update', 'Editar roles y sus permisos'),
  org('role', 'delete', 'Eliminar roles'),

  org('warehouse', 'read', 'Ver los almacenes'),
  org('warehouse', 'create', 'Crear almacenes'),
  org('warehouse', 'update', 'Editar almacenes'),
  org('warehouse', 'archive', 'Dar de baja almacenes'),

  org('product', 'read', 'Ver el catálogo de productos'),
  org('product', 'create', 'Crear productos'),
  org('product', 'update', 'Editar productos'),
  org('product', 'archive', 'Dar de baja productos'),

  org('catalog', 'manage', 'Administrar categorías y unidades de medida'),

  org('supplier', 'read', 'Ver proveedores'),
  org('supplier', 'create', 'Crear proveedores'),
  org('supplier', 'update', 'Editar proveedores'),
  org('supplier', 'archive', 'Dar de baja proveedores'),

  org('customer', 'read', 'Ver clientes'),
  org('customer', 'create', 'Crear clientes'),
  org('customer', 'update', 'Editar clientes'),
  org('customer', 'archive', 'Dar de baja clientes'),

  org('inventory', 'read', 'Consultar existencias y movimientos'),
  org('inventory', 'receive', 'Registrar entradas de inventario'),
  org('inventory', 'issue', 'Registrar salidas de inventario'),
  org('inventory', 'transfer', 'Transferir entre almacenes'),
  org('inventory', 'adjust', 'Ajustar existencias de forma manual'),
  org('inventory', 'count', 'Registrar conteos físicos'),

  org('lot', 'manage', 'Administrar lotes y números de serie'),

  org('purchase_order', 'read', 'Ver órdenes de compra'),
  org('purchase_order', 'create', 'Crear órdenes de compra'),
  org('purchase_order', 'update', 'Editar órdenes de compra'),
  org('purchase_order', 'approve', 'Aprobar órdenes de compra'),
  org('purchase_order', 'cancel', 'Cancelar órdenes de compra'),
  org('purchase_receipt', 'read', 'Ver recepciones de compra'),
  org('purchase_receipt', 'create', 'Registrar recepciones de compra'),

  org('sales_order', 'read', 'Ver pedidos de venta'),
  org('sales_order', 'create', 'Crear pedidos de venta'),
  org('sales_order', 'update', 'Editar pedidos de venta'),
  org('sales_order', 'confirm', 'Confirmar pedidos de venta'),
  org('sales_order', 'cancel', 'Cancelar pedidos de venta'),
  org('sales_shipment', 'read', 'Ver despachos'),
  org('sales_shipment', 'create', 'Registrar despachos'),

  org('report', 'read', 'Consultar informes'),
  org('audit', 'read', 'Consultar la bitácora de auditoría de la empresa'),
] as const satisfies readonly PermissionDefinition[];

/** Todos los códigos de permiso válidos, como tipo. */
export type PermissionCode = (typeof PERMISSIONS)[number]['code'];

export const ORGANIZATION_PERMISSIONS = PERMISSIONS.filter(
  (permission) => permission.scope === 'ORGANIZATION',
);

export const PLATFORM_PERMISSIONS = PERMISSIONS.filter(
  (permission) => permission.scope === 'PLATFORM',
);

/**
 * Plantillas de rol.
 *
 * Los roles pertenecen a cada empresa, así que no se pueden crear en la semilla:
 * cuando esta corre todavía no existe ninguna empresa. Lo que se define aquí es
 * qué permisos lleva cada rol, y el alta de empresa copia estas plantillas para
 * que nazca con sus roles listos.
 *
 * RN-009, todavía por confirmar con negocio.
 */
export interface RoleTemplate {
  readonly name: string;
  readonly description: string;
  /** Marca el rol que recibe todo permiso de empresa, incluidos los futuros. */
  readonly grantsEveryOrganizationPermission?: boolean;
  readonly permissions?: readonly PermissionCode[];
}

export const ROLE_TEMPLATES = [
  {
    name: 'Administrador',
    description: 'Control total dentro de la empresa.',
    grantsEveryOrganizationPermission: true,
  },
  {
    name: 'Compras',
    description: 'Gestiona proveedores, órdenes de compra y recepciones.',
    permissions: [
      'organization:read',
      'product:read',
      'supplier:read',
      'supplier:create',
      'supplier:update',
      'inventory:read',
      'inventory:receive',
      'purchase_order:read',
      'purchase_order:create',
      'purchase_order:update',
      'purchase_receipt:read',
      'purchase_receipt:create',
      'report:read',
    ],
  },
  {
    name: 'Ventas',
    description: 'Gestiona clientes, pedidos de venta y despachos.',
    permissions: [
      'organization:read',
      'product:read',
      'customer:read',
      'customer:create',
      'customer:update',
      'inventory:read',
      'sales_order:read',
      'sales_order:create',
      'sales_order:update',
      'sales_order:confirm',
      'sales_shipment:read',
      'report:read',
    ],
  },
  {
    name: 'Almacén',
    description: 'Opera el movimiento físico de mercancía.',
    permissions: [
      'organization:read',
      'product:read',
      'warehouse:read',
      'inventory:read',
      'inventory:receive',
      'inventory:issue',
      'inventory:transfer',
      'inventory:count',
      'lot:manage',
      'purchase_receipt:read',
      'purchase_receipt:create',
      'sales_shipment:read',
      'sales_shipment:create',
    ],
  },
  {
    name: 'Consulta',
    description: 'Solo lectura. No puede modificar nada.',
    permissions: [
      'organization:read',
      'product:read',
      'warehouse:read',
      'supplier:read',
      'customer:read',
      'inventory:read',
      'purchase_order:read',
      'purchase_receipt:read',
      'sales_order:read',
      'sales_shipment:read',
      'report:read',
    ],
  },
] as const satisfies readonly RoleTemplate[];

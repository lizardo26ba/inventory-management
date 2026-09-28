/** Rutas de almacenes en la maqueta. Una sola vez, para que no diverjan. */
export const WAREHOUSES_PATH = '/prototype/warehouses';
export const NEW_WAREHOUSE_PATH = `${WAREHOUSES_PATH}/new`;
export const OVERVIEW_PATH = '/prototype';

export function editWarehousePath(id: string): string {
  return `${WAREHOUSES_PATH}/${id}/edit`;
}

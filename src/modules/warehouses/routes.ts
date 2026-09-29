/**
 * Rutas del dominio de almacenes.
 *
 * Aparte de las pantallas para que un componente de cliente pueda enlazar sin
 * arrastrar código de servidor, y para que cambiar una ruta sea un cambio en un
 * solo archivo.
 *
 * La dirección lleva el código y no el identificador: es corto, se reconoce y no
 * cambia nunca (RN-091), así que un enlace guardado sigue valiendo.
 */

export const WAREHOUSES_PATH = '/warehouses';

export const NEW_WAREHOUSE_PATH = `${WAREHOUSES_PATH}/new`;

export function editWarehousePath(code: string): string {
  return `${WAREHOUSES_PATH}/${encodeURIComponent(code)}/edit`;
}

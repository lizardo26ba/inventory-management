/**
 * Rutas del dominio de usuarios.
 *
 * Aparte de las pantallas para que un componente de cliente pueda enlazar sin
 * arrastrar código de servidor, y para que cambiar una ruta sea un cambio en un
 * solo archivo.
 */

export const USERS_PATH = '/users';

export function userEditPath(id: string): string {
  return `${USERS_PATH}/${id}/edit`;
}

/**
 * Rutas del dominio de empresas.
 *
 * Aparte de las pantallas para que un componente de cliente pueda enlazar sin
 * arrastrar código de servidor, y para que cambiar una ruta sea un cambio en un
 * solo archivo.
 */

export const ORGANIZATIONS_PATH = '/organizations';

export function organizationPath(slug: string): string {
  return `${ORGANIZATIONS_PATH}/${slug}`;
}

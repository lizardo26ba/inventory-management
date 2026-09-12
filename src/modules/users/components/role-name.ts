/**
 * Cómo se lee el nombre de un rol.
 *
 * Los roles que crea el sistema tienen código, y su nombre sale del catálogo de
 * textos: así se leen en el idioma de quien mira, no en el de quien creó la
 * empresa. Los roles que crea una empresa no tienen código, y entonces lo que se
 * muestra es el nombre que su autor escribió, que es lo único que existe.
 *
 * Es una función y no un componente porque su resultado también va a atributos
 * que solo aceptan texto, como la etiqueta anunciada de un desplegable.
 */

import { type Copy } from '@/lib/i18n';

export function roleName(
  role: { readonly code: string | null; readonly name: string },
  copy: Copy,
): string {
  if (role.code === null) return role.name;

  const known = copy.roles[role.code as keyof Copy['roles']];
  return known ?? role.name;
}

/**
 * Credenciales de la maqueta.
 *
 * ATENCIÓN: esto NO es autenticación. Es una comparación de texto en el
 * navegador, escrita para que el prototipo se pueda recorrer de punta a punta
 * sin servidor. Cualquiera que abra las herramientas del navegador las ve.
 *
 * No contradice la regla de cero valores quemados de CLAUDE.md porque no son un
 * secreto: no abren nada, no existen en ninguna base de datos y no se parecen a
 * ninguna credencial real. Se declaran aquí, en un único archivo con nombre
 * evidente, para que borrarlas sea un solo gesto.
 *
 * Este archivo se elimina cuando entre la autenticación real, junto con toda la
 * carpeta del prototipo.
 */

export const DEMO_EMAIL = 'admin@gt.com';
export const DEMO_PASSWORD = 'admin';

/** Destino tras un acceso correcto: la administración de empresas. */
export const DEMO_LANDING_PATH = '/prototype/organizations';

export function matchesDemoCredentials(email: string, password: string): boolean {
  return email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD;
}

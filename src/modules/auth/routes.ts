/**
 * Rutas del acceso.
 *
 * Viven aparte de las acciones porque un archivo marcado como Server Actions
 * solo puede exportar funciones asíncronas: una constante ahí dentro es un error
 * de compilación. Además así las puede leer un componente de cliente sin
 * arrastrar el servidor.
 */

export const SIGN_IN_PATH = '/login';
export const SIGNED_IN_PATH = '/';
export const CHANGE_PASSWORD_PATH = '/change-password';

/** Donde elige empresa quien pertenece a varias. ADR 0013. */
export const SELECT_COMPANY_PATH = '/select-company';

/** Donde el super administrador escribe su código al entrar. ADR 0014. */
export const TWO_FACTOR_PATH = '/two-factor';

/** Donde lo activa la primera vez. */
export const TWO_FACTOR_SETUP_PATH = '/two-factor/setup';

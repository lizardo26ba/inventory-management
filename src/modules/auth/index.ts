/**
 * Puerta pública del dominio de autenticación.
 *
 * Existe porque otros dominios necesitan dos cosas de aquí y ninguna más: saber
 * quién pide algo, y convertir una contraseña en su huella. Lo demás, la sesión
 * por dentro, los intentos fallidos, el bloqueo temporal o las consultas, es
 * asunto suyo.
 *
 * La regla de CLAUDE.md dice que un módulo no importa el repositorio ni el
 * servicio de otro, sino la interfaz que este declara. Esto es esa interfaz.
 */

export { MINIMUM_PASSWORD_LENGTH, type ChangePasswordInput, type SignInInput } from './schema';
export { hashPassword } from './service';
export {
  getSession,
  requirePlatformAdmin,
  requirePlatformPermission,
  requireSession,
  type SessionContext,
} from './session';

/**
 * Esquemas de la frontera de autenticación.
 *
 * Todo dato que cruza al servidor pasa por aquí antes de tocar lógica de
 * negocio. Es el principio 2 de CLAUDE.md y no admite excepción: sin esto, lo
 * que llega de un formulario es `unknown` disfrazado de objeto.
 *
 * El mismo esquema vale en las dos orillas. El formulario lo usa para avisar
 * antes de enviar y el servidor para no fiarse de ese aviso, porque una petición
 * puede llegar sin haber pasado por el formulario.
 */

import { z } from 'zod';

/**
 * Longitud mínima de contraseña. Doce caracteres, el mismo número que exige la
 * semilla, porque una regla que cambia según la puerta por la que entras no es
 * una regla.
 */
export const MINIMUM_PASSWORD_LENGTH = 12;

/**
 * El correo se normaliza a minúsculas aquí y en un solo sitio. La columna es
 * única y Postgres distingue mayúsculas, así que sin esto la misma persona
 * podría registrarse dos veces.
 */
const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'required')
  .email('invalidEmail')
  .max(254, 'tooLong');

export const signInSchema = z.object({
  email,
  // No se valida la longitud al entrar. Una contraseña vieja puede ser más
  // corta que el mínimo de hoy, y rechazarla aquí le diría a quien la escribe
  // que su cuenta existe pero su contraseña ya no cumple. Eso es información
  // que no se regala.
  password: z.string().min(1, 'required'),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'required'),
    newPassword: z.string().min(MINIMUM_PASSWORD_LENGTH, 'tooShort'),
    confirmPassword: z.string().min(1, 'required'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'mismatch',
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    message: 'unchanged',
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * Traduce el fallo de Zod al mapa de campo y motivo que la interfaz pinta.
 *
 * Los mensajes de los esquemas son claves cortas, no frases: la frase depende
 * del idioma de quien mira, y ese dato no existe en esta capa.
 */
export function toFieldErrors(error: z.ZodError): Readonly<Record<string, string>> {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path.join('.');
    // El primero gana. Enseñar dos motivos del mismo campo a la vez no ayuda a
    // corregirlo.
    if (field !== '' && fieldErrors[field] === undefined) {
      fieldErrors[field] = issue.message;
    }
  }

  return fieldErrors;
}

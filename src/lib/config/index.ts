/**
 * Punto de entrada de la configuración.
 *
 * Reexporta únicamente lo público. Es deliberado: si esta puerta ofreciera
 * también la configuración de servidor, bastaría un import distraído desde un
 * componente de cliente para arrastrar secretos al paquete del navegador, y el
 * error aparecería como un fallo de compilación confuso en lugar de como lo que
 * es.
 *
 * El código de servidor pide lo suyo por su nombre:
 *
 *     import { serverEnv } from '@/lib/config/env.server';
 *
 * Ese archivo importa `server-only`, así que la puerta equivocada se cierra sola.
 */

export { clientEnv, type ClientEnvironment } from './env.client';

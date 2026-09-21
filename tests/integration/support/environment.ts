/**
 * El entorno de la suite de integración.
 *
 * Corre fuera de la aplicación, igual que la semilla, y por eso lee el entorno
 * directamente. La regla de leerlo solo desde src/lib/config es para el código de la
 * aplicación, y ese código no sabe que está en una prueba. Ver ADR 0009.
 */

import { existsSync } from 'node:fs';

import { checkTestDatabase } from './test-database';

const ENV_FILE = '.env';

/**
 * Carga el `.env` del equipo si existe. Vitest no lo hace por su cuenta.
 *
 * En integración continua no habrá archivo: las variables llegarán inyectadas, y las
 * que ya están definidas no se sobrescriben.
 */
export function loadLocalEnvironment(): void {
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
}

/** La base de pruebas, ya comprobada. Detiene la suite con el motivo si no es segura. */
export function requireTestDatabaseUrl(): string {
  const check = checkTestDatabase(process.env.TEST_DATABASE_URL, [
    process.env.DATABASE_URL,
    process.env.DIRECT_DATABASE_URL,
  ]);

  if (!check.ok) {
    throw new Error(
      `Suite de integración detenida: ${check.reason} Ver docs/adr/0009-pruebas-de-integracion-en-rama-de-neon.md`,
    );
  }

  return check.url;
}

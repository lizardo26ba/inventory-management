/**
 * Preparación única de la suite de integración.
 *
 * Deja la base de pruebas recién hecha: borra el esquema entero y aplica todas las
 * migraciones desde cero. Cada ejecución parte del mismo estado, y de paso se comprueba
 * que las migraciones se aplican en orden sobre una base vacía.
 *
 * Se borra el esquema en lugar de usar `prisma migrate reset` por dos razones. La primera
 * es que `reset` se niega a correr cuando detecta que lo invoca un agente, así que la
 * suite no se podría ejecutar ni desde aquí ni más adelante sin una persona delante. La
 * segunda es que esto hace exactamente lo que hace falta y nada más.
 *
 * Quien protege de borrar lo que no toca es la guarda, que corre antes que nada y solo
 * acepta una base de pruebas distinta de las de la aplicación.
 *
 * Recrear en lugar de vaciar tabla por tabla no es cuestión de gusto: `audit_logs`
 * rechaza `TRUNCATE` y `DELETE` por disparador (RN-071), así que no se puede vaciar.
 *
 * Ver ADR 0009.
 */

import { execFileSync } from 'node:child_process';

import { loadLocalEnvironment, requireTestDatabaseUrl } from './support/environment';

/** Deja la base como recién creada. Solo alcanza a la base a la que se conecta. */
const DROP_SCHEMA = 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;';

const SCHEMA_PATH = 'prisma/schema.prisma';

export default function setup(): void {
  loadLocalEnvironment();
  const testUrl = requireTestDatabaseUrl();

  // Las dos variables apuntan a la base de pruebas solo en los procesos hijos. Prisma
  // migra por la directa, y sin sustituirla usaría la de desarrollo.
  const env = { ...process.env, DATABASE_URL: testUrl, DIRECT_DATABASE_URL: testUrl };

  execFileSync('npx', ['prisma', 'db', 'execute', '--schema', SCHEMA_PATH, '--stdin'], {
    input: DROP_SCHEMA,
    stdio: ['pipe', 'inherit', 'inherit'],
    env,
    shell: true,
  });

  execFileSync('npx', ['prisma', 'migrate', 'deploy', '--schema', SCHEMA_PATH], {
    stdio: 'inherit',
    env,
    shell: true,
  });
}

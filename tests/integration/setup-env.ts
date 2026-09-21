/**
 * Entorno de cada archivo de la suite de integración.
 *
 * Corre antes de que el archivo importe nada de la aplicación. El cliente de Prisma lee
 * `DATABASE_URL` al cargarse, así que aquí se sustituye por la base de pruebas ya
 * comprobada. La aplicación no sabe que está en una prueba, y no puede alcanzar la base
 * de desarrollo aunque lo intente.
 *
 * La guarda se repite aquí y no se confía en la preparación global: esto corre en otro
 * proceso, y es el que de verdad abre la conexión. Ver ADR 0009.
 */

import { loadLocalEnvironment, requireTestDatabaseUrl } from './support/environment';

loadLocalEnvironment();
const testUrl = requireTestDatabaseUrl();

process.env.DATABASE_URL = testUrl;
process.env.DIRECT_DATABASE_URL = testUrl;

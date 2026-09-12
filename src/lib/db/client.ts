import 'server-only';

/**
 * Cliente de Prisma.
 *
 * Uno solo por proceso. En desarrollo, cada recarga en caliente vuelve a evaluar
 * los módulos, y sin la referencia global de abajo cada recarga abriría un juego
 * nuevo de conexiones hasta agotar las que Postgres admite. Es el fallo clásico
 * de Next en desarrollo y se resuelve así.
 *
 * En producción no existe esa recarga, así que la referencia global no se usa:
 * el módulo se evalúa una vez y ya.
 *
 * Este archivo y el módulo de configuración son lo único que sabe de la conexión.
 * Ningún dominio importa Prisma directamente: lo hace su repositorio, que es la
 * regla de dependencias de CLAUDE.md.
 */

import { PrismaClient } from '@prisma/client';

import { isProduction, serverEnv } from '@/lib/config/env.server';

/**
 * En desarrollo se registra cada consulta porque es lo que permite ver una
 * consulta accidental dentro de un bucle. En producción solo los avisos y los
 * errores: registrar cada consulta sería escribir datos de clientes en el
 * archivo de registro.
 */
const LOG_LEVELS = isProduction
  ? (['warn', 'error'] as const)
  : (['query', 'warn', 'error'] as const);

function createClient(): PrismaClient {
  return new PrismaClient({
    log: [...LOG_LEVELS],
    datasources: { db: { url: serverEnv.DATABASE_URL } },
  });
}

const globalForPrisma = globalThis as typeof globalThis & {
  prismaClient?: PrismaClient;
};

export const prisma: PrismaClient = globalForPrisma.prismaClient ?? createClient();

if (!isProduction) globalForPrisma.prismaClient = prisma;

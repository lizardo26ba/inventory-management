import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * Dos proyectos separados porque tienen necesidades opuestas.
 *
 * Las unitarias corren en paralelo, sin base de datos, y deben ser instantáneas.
 * Las de integración corren contra un PostgreSQL real, en secuencia, porque
 * comparten la misma base y pisarse entre ellas produciría fallos fantasma.
 *
 * Reglas completas en .claude/agents/qa-test-engineer.md
 */
/**
 * El atajo de la arroba, resuelto una vez.
 *
 * Se repite en cada proyecto porque con la configuración por proyectos de Vitest
 * la resolución de la raíz no baja a los hijos, y sin ella ningún import con
 * arroba encuentra su archivo.
 */
const alias = {
  // fileURLToPath y no .pathname: en Windows, .pathname devuelve una ruta con
  // barra inicial y unidad, como /C:/..., que no existe para el sistema de
  // archivos.
  '@': fileURLToPath(new URL('./src/', import.meta.url)),
};

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        resolve: {
          alias: {
            ...alias,
            // El repositorio y el cliente de Prisma importan server-only, que lanza
            // fuera del servidor de React. Aquí se sustituye por un módulo vacío.
            'server-only': fileURLToPath(
              new URL('./tests/integration/support/server-only.ts', import.meta.url),
            ),
          },
        },
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          // Corre contra una rama de Neon dedicada: la preparación global la
          // recrea desde cero y cada archivo apunta la aplicación a ella antes de
          // importarla. Ver docs/adr/0009-pruebas-de-integracion-en-rama-de-neon.md
          globalSetup: ['tests/integration/global-setup.ts'],
          setupFiles: ['tests/integration/setup-env.ts'],
          // La ejecución en serie se pide desde el guion con
          // --no-file-parallelism, porque es una opción de raíz y no de
          // proyecto. Sin ella, el estado de la base se cruza entre archivos y
          // los fallos dejan de ser reproducibles.
          testTimeout: 30_000,
        },
      },
    ],
  },
  resolve: { alias },
});

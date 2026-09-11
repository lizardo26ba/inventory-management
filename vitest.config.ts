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
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
          // La ejecución en serie se pide desde el guion con
          // --no-file-parallelism, porque es una opción de raíz y no de
          // proyecto. Sin ella, el estado de la base se cruza entre archivos y
          // los fallos dejan de ser reproducibles.
          testTimeout: 30_000,
        },
      },
    ],
  },
  resolve: {
    alias: {
      '@': new URL('./src/', import.meta.url).pathname,
    },
  },
});

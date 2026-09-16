/**
 * Sustituto de `server-only` para la suite de integración.
 *
 * El paquete real lanza un error al importarse fuera del servidor de React. En la
 * aplicación eso es justo lo que protege: impide arrastrar la configuración de servidor
 * al navegador. Vitest no es ese servidor, así que con el paquete real no se podrían
 * probar ni el repositorio ni el cliente de Prisma.
 *
 * Este módulo vacío ocupa su lugar solo en el proyecto de integración de
 * `vitest.config.ts`. La aplicación sigue usando el real. Ver ADR 0009.
 */

export {};

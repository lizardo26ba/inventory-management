/**
 * La guarda que impide correr la suite de integración contra una base que importa.
 *
 * La suite recrea la base entera antes de empezar. Si apunta por error a la base de
 * desarrollo o a `main`, borra datos reales, y nada en una cadena de conexión dice de
 * qué rama de Neon es. Por eso se exigen dos cosas que no dependen de acordarse:
 *
 * 1. Que la base se llame con el sufijo de pruebas. Nombrarla así es declararla
 *    desechable.
 * 2. Que no sea el mismo destino que la base de la aplicación ni la de migraciones.
 *
 * Es una función pura, sin entorno ni red, para que se pruebe sola. Ver
 * docs/adr/0009-pruebas-de-integracion-en-rama-de-neon.md
 */

/** El sufijo que declara una base como desechable. */
export const TEST_DATABASE_SUFFIX = '_test';

/** Neon da dos nombres a la misma base: el del agrupador y el directo. */
const NEON_POOLER_MARK = '-pooler.';

export type TestDatabaseCheck =
  { readonly ok: true; readonly url: string } | { readonly ok: false; readonly reason: string };

function databaseName(url: URL): string {
  return decodeURIComponent(url.pathname.replace(/^\//, ''));
}

/** Host, puerto y base, sin credenciales ni parámetros: lo que identifica el destino. */
function destination(url: URL): string {
  const host = url.hostname.replace(NEON_POOLER_MARK, '.');
  return `${host}:${url.port}/${databaseName(url)}`;
}

function parse(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    // Una cadena que no se puede leer no es un destino con el que comparar.
    return null;
  }
}

/**
 * Decide si una base es segura para la suite.
 *
 * Los motivos nombran las variables, nunca sus valores: este texto acaba en la consola.
 */
export function checkTestDatabase(
  testUrl: string | undefined,
  protectedUrls: readonly (string | undefined)[],
): TestDatabaseCheck {
  if (testUrl === undefined || testUrl.trim() === '') {
    return { ok: false, reason: 'TEST_DATABASE_URL no está definida.' };
  }

  const parsed = parse(testUrl);
  if (parsed === null) {
    return { ok: false, reason: 'TEST_DATABASE_URL no es una cadena de conexión válida.' };
  }

  if (!databaseName(parsed).endsWith(TEST_DATABASE_SUFFIX)) {
    return {
      ok: false,
      reason: `La base de TEST_DATABASE_URL tiene que terminar en ${TEST_DATABASE_SUFFIX}.`,
    };
  }

  for (const candidate of protectedUrls) {
    if (candidate === undefined) continue;
    const other = parse(candidate);
    if (other !== null && destination(other) === destination(parsed)) {
      return {
        ok: false,
        reason:
          'TEST_DATABASE_URL apunta a la misma base que DATABASE_URL o DIRECT_DATABASE_URL.',
      };
    }
  }

  return { ok: true, url: testUrl };
}

/**
 * Que la matriz de permisos documentada diga lo que el catálogo concede.
 *
 * La matriz de `docs/architecture/security.md` es la vista que revisa una persona
 * cuando pregunta quién puede hacer qué. Si se escribe a mano y se mantiene a
 * mano, envejece: el permiso nuevo entra al código, la tabla se queda como
 * estaba, y a partir de ahí el documento miente con toda la autoridad de estar
 * escrito.
 *
 * Por eso la tabla no es una copia sino una derivación verificada. Esta prueba es
 * lo que la convierte en eso. Cuando falla, no se arregla la prueba: se actualiza
 * el documento, que es justo el paso que las reglas de documentación exigen al
 * tocar un permiso o un rol.
 *
 * Solo se comparan las filas, no la prosa. Un documento se debe poder reescribir
 * sin pelearse con una prueba.
 */

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  ORGANIZATION_PERMISSIONS,
  PLATFORM_PERMISSIONS,
  ROLE_TEMPLATES,
  permissionsForRoleTemplate,
} from '@/lib/auth/permissions';

const DOCUMENT = new URL('../../../docs/architecture/security.md', import.meta.url);

/** Las marcas de la matriz. Concede y no concede. */
const GRANTED = '✓';
const NOT_GRANTED = '·';

/**
 * Las filas de una tabla de Markdown, ya sin adornos.
 *
 * El formateador alinea las columnas con espacios, así que cada celda se recorta.
 * Solo interesan las filas cuya primera celda es un código entre acentos graves:
 * las demás tablas del documento hablan de otra cosa.
 */
function codeRows(markdown: string): readonly (readonly string[])[] {
  return markdown
    .split('\n')
    .filter((line) => line.startsWith('|'))
    .map((line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim()),
    )
    .filter((cells) => cells[0]?.startsWith('`') === true)
    .map((cells) => [(cells[0] ?? '').replaceAll('`', ''), ...cells.slice(1)]);
}

const rows = codeRows(readFileSync(DOCUMENT, 'utf8'));
const organizationRows = rows.filter((cells) => cells.length === 1 + ROLE_TEMPLATES.length);
const platformRows = rows.filter((cells) => cells.length === 2);

describe('matriz de permisos documentada', () => {
  it('lista los permisos de empresa del catálogo, en su orden', () => {
    expect(organizationRows.map((cells) => cells[0])).toEqual(
      ORGANIZATION_PERMISSIONS.map((permission) => permission.code),
    );
  });

  it('marca en cada rol lo que ese rol concede', () => {
    const granted = ROLE_TEMPLATES.map(
      (template) => new Set<string>(permissionsForRoleTemplate(template)),
    );

    const expected = ORGANIZATION_PERMISSIONS.map((permission) => [
      permission.code,
      ...granted.map((codes) => (codes.has(permission.code) ? GRANTED : NOT_GRANTED)),
    ]);

    expect(organizationRows).toEqual(expected);
  });

  it('lista los permisos de plataforma con su descripción', () => {
    expect(platformRows).toEqual(
      PLATFORM_PERMISSIONS.map((permission) => [permission.code, permission.description]),
    );
  });
});

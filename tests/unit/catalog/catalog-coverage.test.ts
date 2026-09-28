/**
 * Todo componente compartido tiene dónde verse.
 *
 * Recorre `src/components/ui` y exige que cada archivo esté en el catálogo, en la
 * lista de pendientes o en la de lo que no dibuja nada. Un componente nuevo que
 * no aparezca en ninguna hace fallar la verificación: así nadie tiene que
 * acordarse, y la lista de pendientes solo puede encoger.
 *
 * Comprueba también lo contrario: una entrada que nombra un archivo borrado, o
 * una página que falta para una entrada, es un catálogo que miente.
 */

import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { CATALOG_ENTRIES, NON_VISUAL_FILES, PENDING_FILES } from '@/app/catalog/entries';

const COMPONENTS_DIR = fileURLToPath(new URL('../../../src/components/ui/', import.meta.url));
const CATALOG_DIR = fileURLToPath(new URL('../../../src/app/catalog/', import.meta.url));

const componentFiles = readdirSync(COMPONENTS_DIR).filter((file) => /\.tsx?$/.test(file));
const catalogued = CATALOG_ENTRIES.flatMap((entry) => entry.files);
const listed = [...catalogued, ...PENDING_FILES, ...NON_VISUAL_FILES];

describe('catálogo de componentes', () => {
  it.each(componentFiles)(
    '%s está en el catálogo, pendiente o marcado como no visual',
    (file) => {
      expect(listed).toContain(file);
    },
  );

  it('no nombra archivos que ya no existen', () => {
    expect(componentFiles).toEqual(expect.arrayContaining(listed));
  });

  it('no pone un archivo en dos listas a la vez', () => {
    expect(new Set(listed).size).toBe(listed.length);
  });

  it.each(CATALOG_ENTRIES.map((entry) => entry.slug))(
    'la entrada %s tiene su página',
    (slug) => {
      expect(existsSync(`${CATALOG_DIR}${slug}/page.tsx`)).toBe(true);
    },
  );
});

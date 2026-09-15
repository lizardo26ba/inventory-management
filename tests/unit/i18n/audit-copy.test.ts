/**
 * Que ninguna acción de la bitácora llegue a la pantalla sin nombre.
 *
 * La lista de acciones se dibuja recorriendo el diccionario, y el catálogo real
 * vive en el dominio de auditoría. Si los dos se separan, una acción nueva se
 * escribe en la base pero no aparece en el filtro, o aparece escrita como
 * código. Esta prueba es la que los mantiene iguales.
 *
 * También vigila lo contrario: un nombre que sobra sobrevive a la acción que lo
 * justificaba y nadie se atreve a borrarlo. RN-011.
 */

import { describe, expect, it } from 'vitest';

import { copyEn } from '@/lib/i18n/copy';
import { copyEs } from '@/lib/i18n/copy-es';
import { AUDIT_ACTIONS } from '@/modules/audit/types';

describe('traducción de las acciones de la bitácora', () => {
  it('tiene un nombre para cada acción del catálogo, y ninguno de más', () => {
    expect(Object.keys(copyEn.auditActions).sort()).toEqual([...AUDIT_ACTIONS].sort());
  });

  it('dice lo mismo en español, clave por clave', () => {
    expect(Object.keys(copyEs.auditActions).sort()).toEqual(
      Object.keys(copyEn.auditActions).sort(),
    );
  });

  it('no deja ningún nombre vacío en ninguno de los dos idiomas', () => {
    const texts = [
      ...Object.values(copyEn.auditActions),
      ...Object.values(copyEs.auditActions),
    ];
    expect(texts.every((text) => text.trim() !== '')).toBe(true);
  });
});

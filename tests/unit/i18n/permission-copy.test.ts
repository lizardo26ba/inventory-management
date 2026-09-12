/**
 * Que ningún permiso llegue a la pantalla sin frase.
 *
 * El bloque de permisos resultantes se dibuja recorriendo el catálogo, no el
 * diccionario. Un permiso nuevo aparece allí en cuanto se declara, así que sin
 * esta prueba la forma de enterarse de que falta su traducción sería verlo en
 * pantalla escrito como código.
 *
 * También vigila lo contrario. Una clave que sobra no rompe nada visible, y por
 * eso se queda para siempre: sobrevive al permiso que la justificaba y nadie se
 * atreve a borrarla porque no sabe si alguien la usa.
 *
 * Solo se exigen los permisos de empresa. Los de plataforma no se conceden de
 * uno en uno ni se enseñan en ninguna lista, así que traducirlos sería escribir
 * texto que nadie va a leer. RN-011.
 */

import { describe, expect, it } from 'vitest';

import { ORGANIZATION_PERMISSIONS } from '@/lib/auth/permissions';
import { copyEn } from '@/lib/i18n/copy';
import { copyEs } from '@/lib/i18n/copy-es';

const permissionCodes = ORGANIZATION_PERMISSIONS.map((permission) => permission.code);
const resources = [
  ...new Set(ORGANIZATION_PERMISSIONS.map((permission) => permission.resource)),
];

describe('traducción de los permisos', () => {
  it('tiene una frase para cada permiso de empresa', () => {
    const translated = Object.keys(copyEn.permissions);
    expect([...permissionCodes].sort()).toEqual(translated.sort());
  });

  it('tiene un nombre para cada grupo de permisos', () => {
    const translated = Object.keys(copyEn.permissionGroups);
    expect([...resources].sort()).toEqual(translated.sort());
  });

  it('dice lo mismo en español, clave por clave', () => {
    expect(Object.keys(copyEs.permissions).sort()).toEqual(
      Object.keys(copyEn.permissions).sort(),
    );
    expect(Object.keys(copyEs.permissionGroups).sort()).toEqual(
      Object.keys(copyEn.permissionGroups).sort(),
    );
  });

  it('no deja ninguna frase vacía en ninguno de los dos idiomas', () => {
    const texts = [
      ...Object.values(copyEn.permissions),
      ...Object.values(copyEn.permissionGroups),
      ...Object.values(copyEs.permissions),
      ...Object.values(copyEs.permissionGroups),
    ];
    expect(texts.every((text) => text.trim() !== '')).toBe(true);
  });
});

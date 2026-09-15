/**
 * Qué secciones tiene el panel y qué permiso abre cada una.
 *
 * Vive aparte del marco, y sin `'use client'`, por una razón que no se ve
 * leyendo el código: lo que exporta un módulo de cliente deja de ser un dato
 * cuando lo mira el servidor, y pasa a ser una referencia a lo que se resolverá
 * en el navegador. Recorrer la lista desde el diseño del panel para decidir qué
 * enseñar fallaba en ejecución con los tipos, el linter y la compilación en
 * verde, porque ninguno de los tres mira esa frontera.
 *
 * Aquí está lo que los dos lados entienden igual: el nombre, la ruta y el
 * permiso. El rótulo y el icono son dibujo, y se quedan en el marco.
 */

import { type PermissionCode } from '@/lib/auth/permissions';

/** Cómo se nombra una sección entre el servidor y el marco. */
export type NavSectionKey = 'organizations' | 'users';

export type NavSection = {
  readonly key: NavSectionKey;
  readonly href: string;
  /** El permiso sin el cual la sección no se dibuja. */
  readonly permission: PermissionCode;
};

/**
 * Lo que hay construido de administración, con el permiso que abre cada cosa.
 *
 * El permiso se declara pegado a la sección, y no en quien dibuja el menú: así
 * una sección nueva nace con su permiso puesto o no nace, en lugar de
 * aparecerle a todo el mundo hasta que alguien se dé cuenta.
 *
 * Esto decide qué se ve, nunca qué se puede hacer. Lo segundo lo decide el
 * servidor en cada pantalla, y seguiría rechazando aunque esta lista mintiera.
 * Es el principio 1 de CLAUDE.md: esconder un control no es autorizar.
 *
 * La bitácora entrará aquí cuando exista su pantalla. Está dibujada en el
 * prototipo y todavía no tiene ruta real.
 */
export const ADMINISTRATION_SECTIONS = [
  { key: 'organizations', href: '/organizations', permission: 'platform.organization:read' },
  { key: 'users', href: '/users', permission: 'platform.user:read' },
] as const satisfies readonly NavSection[];

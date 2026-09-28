/**
 * Qué muestra el catálogo y qué le falta por mostrar.
 *
 * Son datos y nada más, sin JSX, para que la prueba de cobertura los pueda leer
 * sin montar React. Esa prueba recorre `src/components/ui` y falla si un archivo
 * no aparece en ninguna de las tres listas: así un componente nuevo no puede
 * llegar sin que alguien decida dónde se ve.
 *
 * Ver `docs/standards/prototype-and-components.md`, sección 7.
 */

export type CatalogEntry = {
  /** El tramo de la dirección: `/catalog/<slug>`. */
  readonly slug: string;
  readonly title: string;
  /** Una frase: para qué sirve. El detalle está en el comentario del archivo. */
  readonly summary: string;
  /** Los archivos de `src/components/ui` que la página enseña. */
  readonly files: readonly string[];
};

export const CATALOG_ENTRIES: readonly CatalogEntry[] = [
  {
    slug: 'button',
    title: 'Botón',
    summary: 'Tres variantes y dos tamaños, para un botón o para un enlace.',
    files: ['button.tsx'],
  },
  {
    slug: 'tag',
    title: 'Etiqueta',
    summary: 'Nombra algo que viene en grupo y en poco espacio, como los roles.',
    files: ['tag.tsx'],
  },
  {
    slug: 'notice',
    title: 'Aviso',
    summary: 'Lo que hay que leer antes de seguir, antes de que pase.',
    files: ['notice.tsx'],
  },
  {
    slug: 'form',
    title: 'Formulario',
    summary: 'Sección, campo con ayuda o error, desplegable y área de texto.',
    files: ['form.tsx'],
  },
  {
    slug: 'table',
    title: 'Tabla',
    summary: 'El marco de una lista: barra de herramientas, cabecera, filas y vacío.',
    files: ['table.tsx'],
  },
  {
    slug: 'result-dialog',
    title: 'Diálogo de resultado',
    summary: 'Cómo terminó una acción que no cambia de pantalla.',
    files: ['result-dialog.tsx'],
  },
  {
    slug: 'confirm-dialog',
    title: 'Diálogo de confirmación',
    summary: 'Pide permiso antes de una acción y espera a que termine.',
    files: ['confirm-dialog.tsx'],
  },
  {
    slug: 'form-alert',
    title: 'Error de formulario',
    summary: 'Lo que falló al guardar y no pertenece a ningún campo.',
    files: ['form-alert.tsx'],
  },
  {
    slug: 'notice-bar',
    title: 'Barra de aviso',
    summary: 'Un aviso a lo ancho de la página que sigue a la vista mientras se trabaja.',
    files: ['notice-bar.tsx'],
  },
  {
    slug: 'empty-state',
    title: 'Estado vacío',
    summary: 'Lo que ocupa la pantalla cuando no hay nada que enseñar, con una salida.',
    files: ['empty-state.tsx'],
  },
  {
    slug: 'spinner',
    title: 'Indicador de espera',
    summary: 'Una operación en curso, dentro del control que la disparó.',
    files: ['spinner.tsx'],
  },
  {
    slug: 'skeleton',
    title: 'Esqueleto de carga',
    summary: 'La forma de una pantalla mientras llega, sin que nada salte después.',
    files: ['skeleton.tsx'],
  },
  {
    slug: 'table-loading',
    title: 'Recarga de tabla',
    summary: 'Filas atenuadas y una barra fina mientras una tabla que ya se ve se consulta.',
    files: ['table-loading.tsx'],
  },
  {
    slug: 'page-header',
    title: 'Cabecera de pantalla',
    summary: 'De dónde se viene, dónde se está y la acción principal.',
    files: ['page-header.tsx'],
  },
  {
    slug: 'summary-card',
    title: 'Tarjeta de cifra',
    summary: 'Las cifras de cabecera, en una rejilla que se parte igual en todas las listas.',
    files: ['summary-card.tsx'],
  },
  {
    slug: 'definition-list',
    title: 'Lista de definiciones',
    summary: 'Pares de etiqueta y valor para las fichas de solo lectura.',
    files: ['definition-list.tsx'],
  },
  {
    slug: 'avatar',
    title: 'Avatar y monograma',
    summary: 'La cara de una persona o las iniciales de lo que no lo es.',
    files: ['avatar.tsx', 'monogram.tsx'],
  },
  {
    slug: 'flag',
    title: 'Bandera',
    summary: 'El país de un teléfono o de una empresa, en un círculo.',
    files: ['flag.tsx'],
  },
  {
    slug: 'qr-code',
    title: 'Código QR',
    summary: 'El código del alta del segundo factor, dibujado en el servidor.',
    files: ['qr-code.tsx'],
  },
  {
    slug: 'icons',
    title: 'Iconos',
    summary: 'Todos los iconos propios, en la misma rejilla y el mismo trazo.',
    files: ['icons.tsx'],
  },
];

/**
 * Componentes que todavía no tienen su página.
 *
 * La lista solo debe encoger. Llevar uno al catálogo es borrarlo de aquí y
 * añadir su entrada arriba.
 */
export const PENDING_FILES: readonly string[] = [
  'action-button.tsx',
  'checkbox.tsx',
  'choice-list.tsx',
  'country-select.tsx',
  'cursor-pagination.tsx',
  'filter-input.tsx',
  'language-switcher.tsx',
  'one-time-code-field.tsx',
  'pagination.tsx',
  'phone-field.tsx',
  'row-menu.tsx',
  'search-input.tsx',
  'show-password-switch.tsx',
  'side-panel.tsx',
  'table-sort.tsx',
  'toggle.tsx',
  'url-filters.tsx',
];

/** Archivos de la carpeta que no dibujan nada y por eso no tienen página. */
export const NON_VISUAL_FILES: readonly string[] = ['cursor-params.ts'];

export function catalogEntryBySlug(slug: string): CatalogEntry | undefined {
  return CATALOG_ENTRIES.find((entry) => entry.slug === slug);
}

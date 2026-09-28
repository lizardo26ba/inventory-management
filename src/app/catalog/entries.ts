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
];

/**
 * Componentes que todavía no tienen su página.
 *
 * La lista solo debe encoger. Llevar uno al catálogo es borrarlo de aquí y
 * añadir su entrada arriba.
 */
export const PENDING_FILES: readonly string[] = [
  'action-button.tsx',
  'avatar.tsx',
  'checkbox.tsx',
  'choice-list.tsx',
  'confirm-dialog.tsx',
  'country-select.tsx',
  'cursor-pagination.tsx',
  'definition-list.tsx',
  'empty-state.tsx',
  'filter-input.tsx',
  'flag.tsx',
  'form-alert.tsx',
  'icons.tsx',
  'language-switcher.tsx',
  'monogram.tsx',
  'notice-bar.tsx',
  'one-time-code-field.tsx',
  'page-header.tsx',
  'pagination.tsx',
  'phone-field.tsx',
  'qr-code.tsx',
  'row-menu.tsx',
  'search-input.tsx',
  'show-password-switch.tsx',
  'side-panel.tsx',
  'skeleton.tsx',
  'spinner.tsx',
  'summary-card.tsx',
  'table-loading.tsx',
  'table-sort.tsx',
  'toggle.tsx',
  'url-filters.tsx',
];

/** Archivos de la carpeta que no dibujan nada y por eso no tienen página. */
export const NON_VISUAL_FILES: readonly string[] = ['cursor-params.ts'];

export function catalogEntryBySlug(slug: string): CatalogEntry | undefined {
  return CATALOG_ENTRIES.find((entry) => entry.slug === slug);
}

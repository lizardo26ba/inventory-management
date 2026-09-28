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

/**
 * Las familias del menú, en el orden en que aparecen. Con todas las piezas en
 * una sola lista, encontrar una obligaba a leer las cuarenta.
 */
export const CATALOG_GROUPS = [
  'Acciones',
  'Formularios',
  'Listas y tablas',
  'Diálogos y paneles',
  'Avisos y carga',
  'Presentación',
] as const;

export type CatalogGroup = (typeof CATALOG_GROUPS)[number];

export type CatalogEntry = {
  /** El tramo de la dirección: `/catalog/<slug>`. */
  readonly slug: string;
  readonly title: string;
  readonly group: CatalogGroup;
  /** Una frase: para qué sirve. El detalle está en el comentario del archivo. */
  readonly summary: string;
  /** Los archivos de `src/components/ui` que la página enseña. */
  readonly files: readonly string[];
};

export const CATALOG_ENTRIES: readonly CatalogEntry[] = [
  {
    slug: 'button',
    title: 'Botón',
    group: 'Acciones',
    summary: 'Tres variantes y dos tamaños, para un botón o para un enlace.',
    files: ['button.tsx'],
  },
  {
    slug: 'action-button',
    title: 'Botón de acción',
    group: 'Acciones',
    summary: 'Un botón que espera a su operación y no la lanza dos veces.',
    files: ['action-button.tsx'],
  },
  {
    slug: 'row-menu',
    title: 'Menú de fila',
    group: 'Acciones',
    summary: 'Las acciones de una fila, detrás de un botón, con teclado completo.',
    files: ['row-menu.tsx'],
  },
  {
    slug: 'form',
    title: 'Formulario',
    group: 'Formularios',
    summary: 'Sección, campo con ayuda o error, desplegable y área de texto.',
    files: ['form.tsx'],
  },
  {
    slug: 'checkbox',
    title: 'Casilla',
    group: 'Formularios',
    summary: 'Una casilla que se marca o que solo informa.',
    files: ['checkbox.tsx'],
  },
  {
    slug: 'toggle',
    title: 'Interruptor',
    group: 'Formularios',
    summary: 'Enciende o apaga algo, y espera si el cambio se guarda en el servidor.',
    files: ['toggle.tsx'],
  },
  {
    slug: 'show-password-switch',
    title: 'Mostrar contraseña',
    group: 'Formularios',
    summary: 'El interruptor que deja ver lo que se escribe en un campo de contraseña.',
    files: ['show-password-switch.tsx'],
  },
  {
    slug: 'choice-list',
    title: 'Lista de opciones',
    group: 'Formularios',
    summary: 'Elegir una entre pocas, con lo que identifica a cada una.',
    files: ['choice-list.tsx'],
  },
  {
    slug: 'country-and-phone',
    title: 'País y teléfono',
    group: 'Formularios',
    summary: 'Selector de país con bandera y el teléfono con su prefijo.',
    files: ['country-select.tsx', 'phone-field.tsx'],
  },
  {
    slug: 'one-time-code-field',
    title: 'Código de un solo uso',
    group: 'Formularios',
    summary: 'Una casilla por dígito, con pegado, flechas y nombre para cada una.',
    files: ['one-time-code-field.tsx'],
  },
  {
    slug: 'table',
    title: 'Tabla',
    group: 'Listas y tablas',
    summary: 'El marco de una lista: barra de herramientas, cabecera, filas y vacío.',
    files: ['table.tsx'],
  },
  {
    slug: 'table-sort',
    title: 'Orden de tabla',
    group: 'Listas y tablas',
    summary: 'Cabeceras que ordenan escribiendo el criterio en la dirección.',
    files: ['table-sort.tsx'],
  },
  {
    slug: 'pagination',
    title: 'Paginación',
    group: 'Listas y tablas',
    summary: 'El pie de páginas numeradas, con selector de filas.',
    files: ['pagination.tsx'],
  },
  {
    slug: 'cursor-pagination',
    title: 'Paginación por cursor',
    group: 'Listas y tablas',
    summary: 'El pie de las listas que crecen sin techo, sin total ni salto al final.',
    files: ['cursor-pagination.tsx'],
  },
  {
    slug: 'search-input',
    title: 'Buscador',
    group: 'Listas y tablas',
    summary: 'Lleva la búsqueda a la dirección para que la resuelva el servidor.',
    files: ['search-input.tsx'],
  },
  {
    slug: 'url-filters',
    title: 'Filtros',
    group: 'Listas y tablas',
    summary: 'Desplegables, fechas y texto exacto que viven en la dirección.',
    files: ['url-filters.tsx'],
  },
  {
    slug: 'filter-input',
    title: 'Filtro local',
    group: 'Listas y tablas',
    summary: 'Filtra en el navegador una lista corta que ya está en pantalla.',
    files: ['filter-input.tsx'],
  },
  {
    slug: 'result-dialog',
    title: 'Diálogo de resultado',
    group: 'Diálogos y paneles',
    summary: 'Cómo terminó una acción que no cambia de pantalla.',
    files: ['result-dialog.tsx'],
  },
  {
    slug: 'confirm-dialog',
    title: 'Diálogo de confirmación',
    group: 'Diálogos y paneles',
    summary: 'Pide permiso antes de una acción y espera a que termine.',
    files: ['confirm-dialog.tsx'],
  },
  {
    slug: 'side-panel',
    title: 'Panel lateral',
    group: 'Diálogos y paneles',
    summary: 'Un detalle modal que se abre y se cierra con la dirección.',
    files: ['side-panel.tsx'],
  },
  {
    slug: 'notice',
    title: 'Aviso',
    group: 'Avisos y carga',
    summary: 'Lo que hay que leer antes de seguir, antes de que pase.',
    files: ['notice.tsx'],
  },
  {
    slug: 'notice-bar',
    title: 'Barra de aviso',
    group: 'Avisos y carga',
    summary: 'Un aviso a lo ancho de la página que sigue a la vista mientras se trabaja.',
    files: ['notice-bar.tsx'],
  },
  {
    slug: 'form-alert',
    title: 'Error de formulario',
    group: 'Avisos y carga',
    summary: 'Lo que falló al guardar y no pertenece a ningún campo.',
    files: ['form-alert.tsx'],
  },
  {
    slug: 'empty-state',
    title: 'Estado vacío',
    group: 'Avisos y carga',
    summary: 'Lo que ocupa la pantalla cuando no hay nada que enseñar, con una salida.',
    files: ['empty-state.tsx'],
  },
  {
    slug: 'spinner',
    title: 'Indicador de espera',
    group: 'Avisos y carga',
    summary: 'Una operación en curso, dentro del control que la disparó.',
    files: ['spinner.tsx'],
  },
  {
    slug: 'skeleton',
    title: 'Esqueleto de carga',
    group: 'Avisos y carga',
    summary: 'La forma de una pantalla mientras llega, sin que nada salte después.',
    files: ['skeleton.tsx'],
  },
  {
    slug: 'table-loading',
    title: 'Recarga de tabla',
    group: 'Avisos y carga',
    summary: 'Filas atenuadas y una barra fina mientras una tabla que ya se ve se consulta.',
    files: ['table-loading.tsx'],
  },
  {
    slug: 'page-header',
    title: 'Cabecera de pantalla',
    group: 'Presentación',
    summary: 'De dónde se viene, dónde se está y la acción principal.',
    files: ['page-header.tsx'],
  },
  {
    slug: 'summary-card',
    title: 'Tarjeta de cifra',
    group: 'Presentación',
    summary: 'Las cifras de cabecera, en una rejilla que se parte igual en todas las listas.',
    files: ['summary-card.tsx'],
  },
  {
    slug: 'definition-list',
    title: 'Lista de definiciones',
    group: 'Presentación',
    summary: 'Pares de etiqueta y valor para las fichas de solo lectura.',
    files: ['definition-list.tsx'],
  },
  {
    slug: 'tag',
    title: 'Etiqueta',
    group: 'Presentación',
    summary: 'Nombra algo que viene en grupo y en poco espacio, como los roles.',
    files: ['tag.tsx'],
  },
  {
    slug: 'avatar',
    title: 'Avatar y monograma',
    group: 'Presentación',
    summary: 'La cara de una persona o las iniciales de lo que no lo es.',
    files: ['avatar.tsx', 'monogram.tsx'],
  },
  {
    slug: 'flag',
    title: 'Bandera',
    group: 'Presentación',
    summary: 'El país de un teléfono o de una empresa, en un círculo.',
    files: ['flag.tsx'],
  },
  {
    slug: 'language-switcher',
    title: 'Selector de idioma',
    group: 'Presentación',
    summary: 'Los idiomas disponibles, cada uno en su propio idioma.',
    files: ['language-switcher.tsx'],
  },
  {
    slug: 'qr-code',
    title: 'Código QR',
    group: 'Presentación',
    summary: 'El código del alta del segundo factor, dibujado en el servidor.',
    files: ['qr-code.tsx'],
  },
  {
    slug: 'icons',
    title: 'Iconos',
    group: 'Presentación',
    summary: 'Todos los iconos propios, en la misma rejilla y el mismo trazo.',
    files: ['icons.tsx'],
  },
];

/**
 * Componentes que todavía no tienen su página.
 *
 * Hoy está vacía y así debe seguir: un componente nuevo llega con su página. La
 * lista queda para el caso raro en que haga falta fusionar uno antes, y solo
 * puede encoger.
 */
export const PENDING_FILES: readonly string[] = [];

/** Archivos de la carpeta que no dibujan nada y por eso no tienen página. */
export const NON_VISUAL_FILES: readonly string[] = ['cursor-params.ts'];

export function catalogEntryBySlug(slug: string): CatalogEntry | undefined {
  return CATALOG_ENTRIES.find((entry) => entry.slug === slug);
}

/** Las entradas de cada familia, en el orden del menú. Sin familias vacías. */
export function entriesByGroup(): readonly {
  readonly group: CatalogGroup;
  readonly entries: readonly CatalogEntry[];
}[] {
  return CATALOG_GROUPS.map((group) => ({
    group,
    entries: CATALOG_ENTRIES.filter((entry) => entry.group === group),
  })).filter(({ entries }) => entries.length > 0);
}

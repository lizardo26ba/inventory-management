/**
 * Una lista inventada para las páginas de paginación y de filtros.
 *
 * Tiene filas de sobra para que haya varias páginas, y los números de fila
 * bajan del más reciente al más antiguo, como en la bitácora.
 */

export const SAMPLE_ROW_COUNT = 137;

export type SampleRow = { readonly id: number; readonly label: string };

export const SAMPLE_ROWS: readonly SampleRow[] = Array.from(
  { length: SAMPLE_ROW_COUNT },
  (_, index) => {
    const id = SAMPLE_ROW_COUNT - index;
    return { id, label: `Movimiento ${id}` };
  },
);

/** El selector de filas escribe el tamaño en `?size=`. */
export const PAGE_SIZE_OPTIONS: readonly number[] = [10, 25, 50];
export const DEFAULT_PAGE_SIZE = 10;

/** Un número positivo de la dirección, o el de partida si no lo es. */
export function positiveIntegerOr(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export function pageSizeFrom(raw: string | undefined): number {
  const size = positiveIntegerOr(raw, DEFAULT_PAGE_SIZE);
  return PAGE_SIZE_OPTIONS.includes(size) ? size : DEFAULT_PAGE_SIZE;
}

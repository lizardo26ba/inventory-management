'use client';

/**
 * Ordenamiento de tablas.
 *
 * El criterio vive en la dirección, como la búsqueda y la página. Así una tabla
 * ordenada se puede recargar y compartir por enlace, y el botón de atrás
 * deshace el último cambio de orden.
 *
 * Las cabeceras son enlaces y no botones: cada una lleva a la misma tabla con
 * otro orden, y eso es una navegación. Funcionan con el teclado y se pueden
 * abrir en otra pestaña sin ningún trabajo extra.
 *
 * Un primer clic ordena ascendente. El segundo invierte. La cabecera activa
 * lleva aria-sort, que es lo que anuncia el orden a quien no ve la flecha.
 *
 * La cabecera arma su propio enlace leyendo la dirección actual. Recibir una
 * función que lo construya sería más flexible y la dejaría fuera del alcance de
 * una pantalla de servidor, porque una función no cruza esa frontera. Así la
 * misma cabecera sirve en las dos orillas.
 */

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import { IconSortAsc, IconSortDesc, IconSortNone } from './icons';

export type SortDirection = 'asc' | 'desc';

export type SortState = {
  readonly sortKey: string;
  readonly direction: SortDirection;
  readonly hrefFor: (key: string) => string;
};

export function useTableSort(
  defaultKey: string,
  /**
   * Toda lista empieza por lo más reciente, así que este es el sentido por
   * defecto. Una lista que arranque por otra columna lo dice al llamar.
   */
  defaultDirection: SortDirection = 'desc',
): SortState {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sortKey = searchParams.get('sort') ?? defaultKey;
  const requestedDirection = searchParams.get('dir');
  const direction: SortDirection =
    requestedDirection === 'desc' || requestedDirection === 'asc'
      ? requestedDirection
      : defaultDirection;

  function hrefFor(key: string): string {
    const params = new URLSearchParams(searchParams.toString());
    const nextDirection: SortDirection =
      key === sortKey && direction === 'asc' ? 'desc' : 'asc';

    params.set('sort', key);
    // El sentido se escribe siempre, porque su ausencia no significa
    // ascendente: significa el que cada lista tenga por defecto.
    params.set('dir', nextDirection);
    // Reordenar cambia qué cae en cada página, así que se vuelve a la primera.
    params.delete('page');

    const suffix = params.toString();
    return suffix === '' ? pathname : `${pathname}?${suffix}`;
  }

  return { sortKey, direction, hrefFor };
}

/** Compara dos valores del mismo tipo. Los textos se comparan por idioma. */
function compareValues(a: string | number | boolean, b: string | number | boolean): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return String(a).localeCompare(String(b), 'en');
}

export function sortRows<T>(
  rows: readonly T[],
  accessor: ((row: T) => string | number | boolean) | undefined,
  direction: SortDirection,
): readonly T[] {
  if (accessor === undefined) return rows;
  const sign = direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => sign * compareValues(accessor(a), accessor(b)));
}

export function SortableHeader({
  label,
  columnKey,
  activeKey,
  direction,
  align = 'left',
  className = '',
}: {
  readonly label: string;
  readonly columnKey: string;
  /** Por qué columna está ordenada la tabla ahora mismo. */
  readonly activeKey: string;
  readonly direction: SortDirection;
  readonly align?: 'left' | 'right';
  readonly className?: string;
}): React.ReactElement {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isActive = activeKey === columnKey;
  const Icon = !isActive ? IconSortNone : direction === 'asc' ? IconSortAsc : IconSortDesc;

  function href(): string {
    const params = new URLSearchParams(searchParams.toString());
    const next: SortDirection = isActive && direction === 'asc' ? 'desc' : 'asc';

    params.set('sort', columnKey);
    // El sentido se escribe siempre, porque su ausencia no significa ascendente:
    // significa el que cada lista tenga por defecto.
    params.set('dir', next);
    // Reordenar cambia qué cae en cada página, así que se vuelve a la primera.
    params.delete('page');

    const suffix = params.toString();
    return suffix === '' ? pathname : `${pathname}?${suffix}`;
  }

  return (
    <th
      scope="col"
      aria-sort={isActive ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-4 py-2.5 font-medium ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}
    >
      <Link
        href={href()}
        scroll={false}
        className={`hover:text-text inline-flex items-center gap-1 transition-colors ${
          isActive ? 'text-text' : ''
        } ${align === 'right' ? 'flex-row-reverse' : ''}`}
      >
        {label}
        <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? '' : 'opacity-40'}`} />
      </Link>
    </th>
  );
}

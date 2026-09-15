'use client';

/**
 * Pie de paginación por cursor.
 *
 * Para las listas que crecen sin techo, como la bitácora. Saltar a la página
 * treinta obliga a la base a recorrer y descartar las veintinueve anteriores, y
 * lo que tarda crece con la tabla. Pedir las veinte filas que siguen a una fila
 * concreta cuesta lo mismo con cien filas que con cien millones. Ver
 * `.claude/agents/database-architect.md`, sección 6.
 *
 * Por eso no hay total, ni número de página, ni salto al final: contarlo todo
 * sería la misma consulta cara que se quiere evitar. Lo que ofrece es volver a
 * lo más reciente, que es el destino que más se pide, y moverse hacia delante o
 * hacia atrás desde donde se está.
 *
 * El cursor es el identificador de la fila frontera y viaja en la dirección. Es
 * opaco: quien lo lee no debe interpretarlo. Cambiar un filtro o el tamaño lo
 * borra, porque la frontera de un resultado no significa nada en otro.
 */

import { usePathname, useSearchParams } from 'next/navigation';

import { useCopy } from '@/lib/i18n';
import { formatQuantity } from '@/lib/format';
import { IconFirstPage } from './icons';
import { PageSizeControl, PaginationStep } from './pagination';

/** Los parámetros de la dirección que guardan la posición en la lista. */
export const CURSOR_PARAMS = {
  /** Mostrar lo anterior a esta fila. */
  older: 'older',
  /** Mostrar lo posterior a esta fila. */
  newer: 'newer',
} as const;

export const CURSOR_PARAM_KEYS = [CURSOR_PARAMS.older, CURSOR_PARAMS.newer] as const;

export function CursorPagination({
  newerCursor,
  olderCursor,
  visibleCount,
  pageSize,
  pageSizeOptions,
  defaultPageSize,
  controlId,
}: {
  /** La frontera para ver lo más reciente, o nulo si no hay nada más reciente. */
  readonly newerCursor: string | null;
  /** La frontera para ver lo anterior, o nulo si no hay nada más antiguo. */
  readonly olderCursor: string | null;
  readonly visibleCount: number;
  readonly pageSize: number;
  readonly pageSizeOptions: readonly number[];
  readonly defaultPageSize: number;
  /** Identificador del selector de filas. Único por tabla, para su etiqueta. */
  readonly controlId: string;
}): React.ReactElement {
  const copy = useCopy();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Un solo cursor a la vez: moverse en un sentido borra el del otro.
  function hrefAt(cursor: {
    readonly older: string | null;
    readonly newer: string | null;
  }): string {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(CURSOR_PARAMS.older);
    params.delete(CURSOR_PARAMS.newer);
    if (cursor.older !== null) params.set(CURSOR_PARAMS.older, cursor.older);
    if (cursor.newer !== null) params.set(CURSOR_PARAMS.newer, cursor.newer);

    const suffix = params.toString();
    return suffix === '' ? pathname : `${pathname}?${suffix}`;
  }

  const isAtNewest = newerCursor === null;

  return (
    <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
      <div className="flex items-center gap-3">
        <PageSizeControl
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          defaultPageSize={defaultPageSize}
          controlId={controlId}
          resetParams={CURSOR_PARAM_KEYS}
        />

        <p className="text-text-muted">
          {copy.pagination.showing} {formatQuantity(visibleCount)}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <PaginationStep
          href={isAtNewest ? null : hrefAt({ older: null, newer: null })}
          label={copy.pagination.newest}
          icon={IconFirstPage}
        />
        <PaginationStep
          href={newerCursor === null ? null : hrefAt({ older: null, newer: newerCursor })}
          label={copy.pagination.newer}
        />
        <PaginationStep
          href={olderCursor === null ? null : hrefAt({ older: olderCursor, newer: null })}
          label={copy.pagination.older}
        />
      </div>
    </div>
  );
}

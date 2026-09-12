'use client';

/**
 * Pie de paginación, común a todas las tablas.
 *
 * Estaba copiado en cada lista y en cada copia había que acordarse de cambiar lo
 * mismo. Aquí vive una vez, así que una tabla nueva hereda el mismo pie sin
 * decidir nada.
 *
 * Cuatro saltos y no dos. Con solo anterior y siguiente, volver al principio de
 * una lista de treinta páginas son veintinueve clics, y mirar el final es
 * imposible sin editar la dirección a mano. Los extremos son los dos destinos
 * que más se piden, y ninguno se alcanza recorriendo.
 *
 * Los cuatro son enlaces, no botones: cada uno lleva a la misma tabla en otra
 * página, y eso es una navegación. Se abren en otra pestaña y funcionan con el
 * teclado sin trabajo extra.
 *
 * El pie arma sus enlaces leyendo la dirección actual, en lugar de recibir una
 * función que los construya. Una función no cruza la frontera del servidor al
 * cliente, así que recibirla dejaría este pie fuera del alcance de cualquier
 * pantalla de servidor, que son casi todas.
 *
 * En el extremo, el salto no se esconde: se muestra apagado y sin enlace. Un
 * control que desaparece mueve a los de al lado, y quien iba a pulsar siguiente
 * termina pulsando otra cosa.
 */

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useCopy } from '@/lib/i18n';
import { formatQuantity } from '@/lib/format';
import { IconFirstPage, IconLastPage } from './icons';

const STEP_CLASS = 'rounded-control inline-flex h-8 items-center border transition-colors';

function Step({
  href,
  label,
  icon: Icon,
}: {
  /** La dirección de destino, o nulo si ya se está en el extremo. */
  readonly href: string | null;
  readonly label: string;
  /** Si se pasa, el salto se dibuja con el icono y la etiqueta queda para
   *  lectores de pantalla. Los extremos no necesitan nombre en pantalla. */
  readonly icon?: (props: { readonly className?: string }) => React.ReactElement;
}): React.ReactElement {
  const padding = Icon === undefined ? 'px-3' : 'px-2';
  const content =
    Icon === undefined ? (
      label
    ) : (
      <>
        <Icon className="h-4 w-4" />
        <span className="sr-only">{label}</span>
      </>
    );

  if (href === null) {
    return (
      <span
        aria-disabled="true"
        className={`${STEP_CLASS} ${padding} border-border text-text-muted opacity-50`}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href as never}
      scroll={false}
      aria-label={Icon === undefined ? undefined : label}
      className={`${STEP_CLASS} ${padding} border-border hover:bg-surface-muted`}
    >
      {content}
    </Link>
  );
}

export function TablePagination({
  page,
  pageCount,
  pageSize,
  pageSizeOptions,
  firstIndex,
  visibleCount,
  totalCount,
  controlId,
  defaultPageSize,
}: {
  readonly page: number;
  readonly pageCount: number;
  readonly pageSize: number;
  readonly pageSizeOptions: readonly number[];
  /** Índice de la primera fila visible, empezando en cero. */
  readonly firstIndex: number;
  readonly visibleCount: number;
  readonly totalCount: number;
  /** Identificador del selector de filas. Único por tabla, para su etiqueta. */
  readonly controlId: string;
  /** El tamaño de partida. No se escribe en la dirección, para no ensuciarla. */
  readonly defaultPageSize: number;
}): React.ReactElement {
  const copy = useCopy();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefWith(changes: Readonly<Record<string, string | null>>): string {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    const suffix = params.toString();
    return suffix === '' ? pathname : `${pathname}?${suffix}`;
  }

  // La primera página no escribe el parámetro: una dirección sin página ya es la
  // primera, y arrastrar page=1 ensucia el enlace que se comparte.
  function hrefForPage(targetPage: number): string {
    return hrefWith({ page: targetPage === 1 ? null : String(targetPage) });
  }

  // Cambiar el tamaño devuelve a la primera página: la número cuatro de un
  // listado de veinte no existe en uno de cien.
  function changePageSize(nextSize: string): void {
    router.replace(
      hrefWith({ size: nextSize === String(defaultPageSize) ? null : nextSize, page: null }),
      { scroll: false },
    );
  }

  return (
    <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
      <div className="flex items-center gap-3">
        <label htmlFor={controlId} className="text-text-muted">
          {copy.pagination.rowsPerPage}
        </label>
        <select
          id={controlId}
          value={String(pageSize)}
          onChange={(event) => changePageSize(event.target.value)}
          className="border-border bg-surface rounded-control h-8 border px-2 text-sm"
        >
          {pageSizeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <p className="text-text-muted">
          {totalCount === 0
            ? `${copy.pagination.showing} 0 ${copy.pagination.of} 0`
            : `${copy.pagination.showing} ${formatQuantity(firstIndex + 1)} - ${formatQuantity(
                firstIndex + visibleCount,
              )} ${copy.pagination.of} ${formatQuantity(totalCount)}`}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-text-muted">
          {copy.pagination.page} {formatQuantity(page)} {copy.pagination.of}{' '}
          {formatQuantity(pageCount)}
        </span>

        <Step
          href={page > 1 ? hrefForPage(1) : null}
          label={copy.pagination.first}
          icon={IconFirstPage}
        />
        <Step href={page > 1 ? hrefForPage(page - 1) : null} label={copy.pagination.previous} />
        <Step
          href={page < pageCount ? hrefForPage(page + 1) : null}
          label={copy.pagination.next}
        />
        <Step
          href={page < pageCount ? hrefForPage(pageCount) : null}
          label={copy.pagination.last}
          icon={IconLastPage}
        />
      </div>
    </div>
  );
}

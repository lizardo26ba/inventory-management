'use client';

/**
 * Esqueletos de carga.
 *
 * Mientras una pantalla llega, el hueco muestra la forma que va a tener y no un
 * texto de espera. La diferencia no es estética: el esqueleto ocupa el mismo
 * sitio que el contenido real, así que nada salta cuando este aparece.
 *
 * Reglas que cumplen todos:
 *
 * - Son decorativos. El bloque que los contiene se anuncia con aria-busy y una
 *   sola frase; las piezas de dentro quedan ocultas al lector de pantalla.
 * - Imitan la estructura, no el contenido. Nunca fingen un dato concreto.
 * - Se usan solo en la primera carga de una pantalla. Recargar una tabla que ya
 *   se ve no la vacía: para eso está la barra de progreso de la cabecera.
 *
 * Es un módulo de cliente aunque lo rendericen archivos loading.tsx de servidor:
 * la frase que anuncia la espera va en el idioma elegido, y esa elección vive en
 * el navegador.
 */

import { useCopy } from '@/lib/i18n';

function Block({ className }: { readonly className: string }): React.ReactElement {
  return (
    <div aria-hidden="true" className={`bg-surface-muted animate-pulse rounded ${className}`} />
  );
}

/** Envoltura que anuncia la espera una sola vez para todo lo que hay dentro. */
export function SkeletonRegion({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className="space-y-5">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Título y subtítulo de pantalla, con el botón de acción a la derecha. */
function HeaderSkeleton(): React.ReactElement {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2">
        <Block className="h-7 w-52" />
        <Block className="h-4 w-72" />
      </div>
      <Block className="h-9 w-36" />
    </div>
  );
}

/** Fila de tarjetas de cifras. */
function SummaryCardsSkeleton({ count }: { readonly count: number }): React.ReactElement {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="border-border bg-surface rounded-card border p-4">
          <Block className="h-3 w-24" />
          <Block className="mt-3 h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

/**
 * Tarjeta de tabla completa: cabecera de filtros, encabezados, filas y pie de
 * paginación. El número de columnas y de filas se pasa desde fuera para que el
 * hueco mida lo mismo que la tabla que va a sustituirlo.
 */
export function TableSkeleton({
  columns,
  rows = 8,
}: {
  readonly columns: number;
  readonly rows?: number;
}): React.ReactElement {
  return (
    <div className="border-border bg-surface rounded-card border">
      <div className="border-border flex flex-wrap items-center gap-2 border-b p-3">
        <Block className="h-9 w-full max-w-xs" />
        <Block className="ml-auto h-4 w-24" />
      </div>

      <div className="border-border bg-surface-muted flex gap-4 border-b px-4 py-3">
        {Array.from({ length: columns }, (_, index) => (
          <Block key={index} className="h-3 flex-1" />
        ))}
      </div>

      {Array.from({ length: rows }, (_, rowIndex) => (
        <div
          key={rowIndex}
          className="border-border flex items-center gap-4 border-b px-4 py-3 last:border-0"
        >
          {Array.from({ length: columns }, (_, columnIndex) => (
            <Block key={columnIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}

      <div className="border-border flex items-center justify-between gap-3 border-t px-4 py-3">
        <Block className="h-4 w-48" />
        <Block className="h-8 w-40" />
      </div>
    </div>
  );
}

/** Pantalla de lista: encabezado, cifras y tabla. */
export function ListPageSkeleton({
  columns,
  summaryCards = 4,
}: {
  readonly columns: number;
  readonly summaryCards?: number;
}): React.ReactElement {
  const copy = useCopy();

  return (
    <SkeletonRegion label={copy.feedback.loadingPage}>
      <HeaderSkeleton />
      {summaryCards > 0 ? <SummaryCardsSkeleton count={summaryCards} /> : null}
      <TableSkeleton columns={columns} />
    </SkeletonRegion>
  );
}

/** Pantalla de formulario: encabezado y secciones con campos. */
export function FormPageSkeleton({
  sections = 3,
  fieldsPerSection = 4,
}: {
  readonly sections?: number;
  readonly fieldsPerSection?: number;
}): React.ReactElement {
  const copy = useCopy();

  return (
    <SkeletonRegion label={copy.feedback.loadingPage}>
      <div className="space-y-2">
        <Block className="h-4 w-24" />
        <Block className="h-7 w-64" />
      </div>

      {Array.from({ length: sections }, (_, sectionIndex) => (
        <section key={sectionIndex} className="border-border bg-surface rounded-card border">
          <div className="border-border border-b px-5 py-3">
            <Block className="h-4 w-40" />
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {Array.from({ length: fieldsPerSection }, (_, fieldIndex) => (
              <div key={fieldIndex} className="space-y-2">
                <Block className="h-3 w-28" />
                <Block className="h-10 w-full" />
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="flex justify-end gap-2">
        <Block className="h-10 w-24" />
        <Block className="h-10 w-28" />
      </div>
    </SkeletonRegion>
  );
}

/** Pantalla de detalle o panel: encabezado, cifras y dos bloques de contenido. */
export function DetailPageSkeleton(): React.ReactElement {
  const copy = useCopy();

  return (
    <SkeletonRegion label={copy.feedback.loadingPage}>
      <HeaderSkeleton />
      <SummaryCardsSkeleton count={4} />
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((index) => (
          <div key={index} className="border-border bg-surface rounded-card border p-5">
            <Block className="h-4 w-40" />
            <div className="mt-4 space-y-3">
              {[0, 1, 2, 3, 4].map((line) => (
                <Block key={line} className="h-4 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}

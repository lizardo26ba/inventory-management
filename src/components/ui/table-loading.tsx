'use client';

/**
 * Estado de carga de una tabla.
 *
 * Cuando una tabla ya tiene contenido y se vuelve a consultar (se busca, se
 * ordena, se cambia de página o de filtro) no se vacía ni se sustituye por un
 * esqueleto. Vaciarla hace saltar la pantalla y borra la referencia visual de
 * quien estaba mirando. En su lugar, las filas actuales se atenúan y una barra
 * fina recorre la cabecera de la tarjeta.
 *
 * Varias cosas pueden estar cargando a la vez: el retardo del buscador, la
 * consulta simulada y, más adelante, la navegación del servidor. Por eso el
 * estado no es un booleano sino un conjunto de fuentes con nombre: la barra se
 * apaga cuando se apaga la última, no cuando termina la primera.
 *
 * Las fuentes son la transición de React que envuelve a una Server Action o a
 * una navegación. El prototipo añade la suya, que finge una consulta.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useCopy } from '@/lib/i18n';

type TableLoading = {
  readonly isLoading: boolean;
  readonly setSourceBusy: (key: string, isBusy: boolean) => void;
};

const TableLoadingContext = createContext<TableLoading | null>(null);

export function TableLoadingProvider({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  const [busySources, setBusySources] = useState<ReadonlySet<string>>(new Set());

  const setSourceBusy = useCallback((key: string, isBusy: boolean) => {
    setBusySources((current) => {
      if (current.has(key) === isBusy) return current;
      const next = new Set(current);
      if (isBusy) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ isLoading: busySources.size > 0, setSourceBusy }),
    [busySources, setSourceBusy],
  );

  return <TableLoadingContext.Provider value={value}>{children}</TableLoadingContext.Provider>;
}

/**
 * Fuera de un proveedor no falla: devuelve un estado apagado. Así el buscador
 * se puede usar en una pantalla que todavía no tenga tabla sin obligar a
 * envolverla.
 */
function useTableLoadingContext(): TableLoading {
  return (
    useContext(TableLoadingContext) ?? {
      isLoading: false,
      setSourceBusy: () => undefined,
    }
  );
}

export function useTableLoading(): boolean {
  return useTableLoadingContext().isLoading;
}

/** Declara que este componente está cargando algo mientras isBusy sea cierto. */
export function useLoadingSource(key: string, isBusy: boolean): void {
  const { setSourceBusy } = useTableLoadingContext();

  useEffect(() => {
    setSourceBusy(key, isBusy);
    return () => setSourceBusy(key, false);
  }, [key, isBusy, setSourceBusy]);
}

/**
 * Barra indeterminada de la cabecera de la tabla.
 *
 * Es indeterminada porque no se sabe cuánto falta, y fingir un porcentaje sería
 * mentir. Se coloca pegada al borde inferior de la cabecera, así que no empuja
 * nada al aparecer.
 */
export function TableProgress(): React.ReactElement | null {
  const copy = useCopy();

  const isLoading = useTableLoading();
  if (!isLoading) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden"
    >
      <span className="sr-only">{copy.feedback.loadingTable}</span>
      <span
        aria-hidden="true"
        data-motion="essential"
        className="bg-primary animate-table-progress block h-full w-1/3 rounded-full"
      />
    </div>
  );
}

/**
 * Envoltura del cuerpo de la tabla mientras se recarga: se atenúa y deja de
 * responder al ratón, para que nadie pulse una fila que está a punto de cambiar.
 */
export function TableBody({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  const isLoading = useTableLoading();

  return (
    <div
      aria-busy={isLoading}
      className={`transition-opacity duration-200 ${
        isLoading ? 'pointer-events-none opacity-50' : 'opacity-100'
      }`}
    >
      {children}
    </div>
  );
}

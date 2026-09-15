/**
 * Lo que ocupa la pantalla cuando no hay nada que enseñar.
 *
 * Sirve para el caso en que la pantalla entera no tiene contenido: un registro
 * que no existe, o que existía y ya no. No es el aviso de una tabla sin filas,
 * que vive dentro de la tabla y no ocupa la página.
 *
 * El título es opcional porque hay dos usos distintos y el mismo dibujo vale
 * para los dos. Sin título, es una nota al pie de una búsqueda que no encontró
 * nada. Con título, es una pantalla que sustituye a otra y tiene que decir en
 * una línea qué pasó, antes de explicarlo: no encontramos la página, no puedes
 * abrir esto, todavía no hay empresa. Sin ese título la persona lee un párrafo
 * para averiguar de qué le hablan.
 *
 * Siempre lleva salida. Un callejón sin salida obliga a usar el botón de
 * retroceso del navegador, que es peor que un enlace.
 */

export function EmptyState({
  title,
  message,
  children,
}: {
  /** Qué pasó, en una línea. Se omite cuando el mensaje ya es la línea. */
  readonly title?: string;
  readonly message: string;
  /** La salida: casi siempre un enlace de vuelta a la lista. */
  readonly children?: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      {title !== undefined ? (
        <h1 className="mb-2 text-xl font-semibold tracking-tight">{title}</h1>
      ) : null}
      <p className="text-text-muted text-sm">{message}</p>
      {children !== undefined ? <div className="mt-4 text-sm">{children}</div> : null}
    </div>
  );
}

/** El enlace de salida, con el mismo aspecto en todas las pantallas. */
export const EMPTY_STATE_LINK_CLASS = 'text-primary inline-block text-sm hover:underline';

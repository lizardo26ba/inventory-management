/**
 * Piezas de tabla.
 *
 * Son marcado y clases, sin datos y sin estado. Cada lista sigue escribiendo sus
 * propias columnas, porque las columnas son del dominio; lo que se comparte es
 * el marco, el borde, el relleno de celda y el aspecto de la cabecera.
 *
 * Hay una pieza por elemento de la tabla en lugar de un componente que recibe
 * columnas y filas. Una tabla genérica obliga a describir cada celda como
 * configuración, y en cuanto una columna necesita un interruptor o un menú la
 * configuración se convierte en un lenguaje propio que hay que aprender.
 *
 * El desplazamiento horizontal es la red de seguridad, no el plan. El plan es
 * que las columnas menos importantes desaparezcan al estrecharse la pantalla,
 * y eso lo decide cada lista con sus propias clases. Cuando aun así no cabe,
 * mejor desplazar que recortar.
 */

/** El relleno de una celda. Va en plantilla con las clases propias de cada columna. */
export const TABLE_CELL_CLASS = 'px-4 py-2.5';

/** El marco de la lista: cabecera de herramientas, tabla y paginación dentro. */
export function TableCard({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  return <div className="border-border bg-surface rounded-card border">{children}</div>;
}

/**
 * La franja de arriba con el buscador y el recuento.
 *
 * Es `relative` porque la barra de progreso de la consulta se cuelga de su borde
 * inferior.
 */
export function TableToolbar({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="border-border relative flex flex-wrap items-center gap-2 border-b p-3">
      {children}
    </div>
  );
}

/** La tabla. Envuelta para que pueda desplazarse cuando no quepa. */
export function Table({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

/** La fila de cabecera. Dentro van las cabeceras, ordenables o no. */
export function TableHeadRow({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <thead>
      <tr className="border-border bg-surface-muted text-text-muted border-b text-left text-xs tracking-wide uppercase">
        {children}
      </tr>
    </thead>
  );
}

/**
 * Cabecera de una columna que no se ordena.
 *
 * Existe para las columnas que la base no puede ordenar y para la del menú de
 * fila, que no tiene nombre visible pero sí necesita uno anunciado.
 */
export function TableHeaderCell({
  label,
  align = 'left',
  isLabelHidden = false,
  className = '',
}: {
  readonly label: string;
  readonly align?: 'left' | 'right';
  readonly isLabelHidden?: boolean;
  readonly className?: string;
}): React.ReactElement {
  const alignClass = align === 'right' ? 'text-right' : '';

  return (
    <th
      scope="col"
      className={`${TABLE_CELL_CLASS} font-medium ${alignClass} ${className}`.trim()}
    >
      {isLabelHidden ? <span className="sr-only">{label}</span> : label}
    </th>
  );
}

/** Una fila de datos. */
export function TableRow({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <tr className="border-border hover:bg-surface-muted border-b last:border-0">{children}</tr>
  );
}

/**
 * Lo que se ve en lugar de la tabla cuando no hay nada que mostrar.
 *
 * Sustituye a la tabla entera y no dibuja una fila vacía: una tabla con
 * cabeceras y ninguna fila parece que se está cargando.
 */
export function TableEmpty({ message }: { readonly message: string }): React.ReactElement {
  return <p className="text-text-muted px-4 py-12 text-center text-sm">{message}</p>;
}

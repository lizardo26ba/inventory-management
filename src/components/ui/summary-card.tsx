/**
 * Cifras de cabecera.
 *
 * La tarjeta no lleva enlace ni menú a propósito. Es un dato, no un control: en
 * cuanto una cifra se vuelve pulsable hay que explicar a dónde lleva, y arriba
 * de la pantalla no hay sitio para explicar nada.
 *
 * La rejilla viaja con la tarjeta porque el número de columnas y la separación
 * son parte del mismo acuerdo visual. Cuando cada pantalla escribía su propia
 * rejilla, dos listas del mismo sistema partían las cifras en puntos distintos.
 */

const GRID_CLASS = 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4';

/** La fila de tarjetas. Pensada para cuatro; con menos quedan a la izquierda. */
export function SummaryCardGrid({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  return <section className={GRID_CLASS}>{children}</section>;
}

/**
 * Una cifra con su nombre encima.
 *
 * El valor llega ya formateado. Aquí no se redondea ni se separan miles: eso
 * depende del idioma y se decide en un solo lugar.
 */
export function SummaryCard({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}): React.ReactElement {
  return (
    <div className="border-border bg-surface rounded-card border p-4">
      <p className="text-text-muted text-xs font-medium tracking-wide uppercase">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

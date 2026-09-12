/**
 * Lista de definiciones para las fichas de solo lectura.
 *
 * Es una lista de definiciones y no una tabla porque los datos de una ficha no
 * son filas comparables entre sí, son pares de etiqueta y valor. Un lector de
 * pantalla los anuncia emparejados, que es como se leen.
 *
 * La etiqueta ocupa un ancho fijo desde la anchura pequeña hacia arriba, para
 * que los valores queden alineados en una columna. Por debajo de eso la
 * etiqueta se pone encima, que es lo único que cabe.
 */

/** El marco de la ficha. Envuelve solo filas de definición. */
export function DefinitionList({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  return <dl className="border-border bg-surface rounded-card border">{children}</dl>;
}

/** Una etiqueta con su valor. El valor puede ser texto o marcado. */
export function DefinitionRow({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="border-border grid gap-1 border-b px-5 py-3 last:border-0 sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="text-text-muted text-sm">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

/**
 * Etiqueta corta dentro de una celda.
 *
 * Sirve para nombrar algo que viene en grupo y en poco espacio: los roles de una
 * persona, las etiquetas de un producto. No es un botón y no reacciona al ratón,
 * porque no lleva a ninguna parte.
 *
 * No se parte en dos líneas. Con varias etiquetas seguidas, lo que se parte es la
 * fila de etiquetas, no una palabra por la mitad.
 */

export function Tag({ children }: { readonly children: React.ReactNode }): React.ReactElement {
  return (
    <span className="bg-surface-muted rounded-control px-1.5 py-0.5 text-xs whitespace-nowrap">
      {children}
    </span>
  );
}

/** La fila que las contiene. Se parte cuando no caben. */
export function TagRow({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  return <span className="flex flex-wrap gap-1">{children}</span>;
}

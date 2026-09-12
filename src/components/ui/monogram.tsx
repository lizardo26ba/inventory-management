/**
 * Cuadro de iniciales.
 *
 * Acompaña al nombre en la primera columna de una lista y sirve para encontrar
 * una fila con la vista, no para identificarla: dos empresas pueden empezar
 * igual. Por eso va oculto para los lectores de pantalla, que ya leen el nombre
 * completo al lado.
 *
 * Es cuadrado y no redondo. Lo redondo es de personas; esto nombra una cosa.
 */

/** Cuántas letras entran sin que el cuadro crezca. */
const MONOGRAM_LENGTH = 2;

export function Monogram({ text }: { readonly text: string }): React.ReactElement {
  return (
    <span
      aria-hidden="true"
      className="bg-primary-soft text-primary rounded-control flex h-8 w-8 shrink-0 items-center justify-center text-xs font-semibold uppercase"
    >
      {text.slice(0, MONOGRAM_LENGTH)}
    </span>
  );
}

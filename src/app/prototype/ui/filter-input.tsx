/**
 * Campo de filtro, con la lupa dentro.
 *
 * No es el buscador de la lista. Aquel escribe en la dirección para que la
 * búsqueda sobreviva a una recarga y se pueda compartir por enlace; este filtra
 * una lista que vive dentro de un formulario, donde la dirección no tiene nada
 * que decir.
 *
 * Es de tipo búsqueda para que el navegador ofrezca su botón de borrar, y más
 * bajo que un campo de formulario porque no es un dato que se vaya a guardar.
 */

import { IconSearch } from './icons';

export function FilterInput({
  value,
  onChange,
  placeholder,
}: {
  readonly value: string;
  readonly onChange: (next: string) => void;
  /** Hace también de etiqueta anunciada: el campo no lleva una visible. */
  readonly placeholder: string;
}): React.ReactElement {
  return (
    <div className="relative">
      <IconSearch className="text-text-muted pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="border-border bg-canvas rounded-control placeholder:text-text-muted h-9 w-full border pr-3 pl-9 text-sm"
      />
    </div>
  );
}

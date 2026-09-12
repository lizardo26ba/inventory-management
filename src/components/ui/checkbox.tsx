/**
 * Casilla de verificación.
 *
 * Es la casilla nativa del navegador con el color del proyecto, y no una caja
 * dibujada a mano. La nativa ya trae el foco, el estado indeterminado, el
 * soporte de teclado y el anuncio correcto de los lectores de pantalla; una
 * imitación empieza sin nada de eso.
 *
 * Cuando está solo de lectura no se dibuja apagada: sigue leyéndose igual, porque
 * lo que muestra es un hecho, no algo que se pueda cambiar aquí.
 */

export function Checkbox({
  id,
  checked,
  onChange,
  label,
  isReadOnly = false,
}: {
  readonly id?: string;
  readonly checked: boolean;
  /** Ausente cuando la casilla solo informa. */
  readonly onChange?: (next: boolean) => void;
  /** Se anuncia cuando la etiqueta visible está lejos o no existe. */
  readonly label?: string;
  readonly isReadOnly?: boolean;
}): React.ReactElement {
  return (
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={onChange === undefined ? undefined : (event) => onChange(event.target.checked)}
      disabled={isReadOnly}
      readOnly={isReadOnly}
      aria-label={label}
      className="accent-primary h-4 w-4 shrink-0"
    />
  );
}

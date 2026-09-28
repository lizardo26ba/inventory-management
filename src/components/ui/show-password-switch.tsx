'use client';

/**
 * El interruptor que deja ver lo que se escribe en un campo de contraseña.
 *
 * Existe porque el ojo que dibuja el navegador dentro del campo no es de fiar:
 * Edge lo pone y lo quita según el foco y el autocompletado, y Chrome y Firefox
 * no lo tienen. Un control propio, fuera del campo, se ve siempre igual. El del
 * navegador se oculta con `PASSWORD_INPUT_CLASS` para que no haya dos.
 *
 * Es un interruptor y no un botón con un ojo porque su estado se lee de un
 * vistazo: encendido, se ve la contraseña. Uno solo gobierna todos los campos de
 * contraseña del formulario, que se muestran u ocultan juntos.
 *
 * El texto al lado también lo acciona: es donde apunta quien busca la opción.
 */

import { Toggle } from './toggle';

export function ShowPasswordSwitch({
  checked,
  label,
  onChange,
}: {
  readonly checked: boolean;
  /** "Mostrar contraseña", o en plural si gobierna varios campos. */
  readonly label: string;
  readonly onChange: (next: boolean) => void;
}): React.ReactElement {
  return (
    <span className="flex items-center gap-2">
      <Toggle checked={checked} label={label} onChange={onChange} />
      <span
        aria-hidden="true"
        onClick={() => onChange(!checked)}
        className="text-text-muted cursor-pointer text-sm select-none"
      >
        {label}
      </span>
    </span>
  );
}

/** Oculta el ojo que Edge dibuja dentro del campo. Va en todo campo de contraseña. */
export const PASSWORD_INPUT_CLASS = '[&::-ms-reveal]:hidden';

/** El tipo del campo según el interruptor. */
export function passwordInputType(isVisible: boolean): 'text' | 'password' {
  return isVisible ? 'text' : 'password';
}

'use client';

/**
 * Interruptor de encendido y apagado.
 *
 * Es un botón con rol de interruptor, no una casilla de verificación: el cambio
 * surte efecto en el acto, sin un botón de guardar que lo confirme, y ese rol es
 * el que lo anuncia así.
 *
 * El estado no lo lleva solo el color. La etiqueta a su lado dice en palabras si
 * está activa o inactiva, porque quien no distingue verde de gris necesita
 * leerlo.
 *
 * Surtir efecto en el acto significa escribir en la base. Mientras esa escritura
 * viaja, el interruptor se bloquea y muestra un indicador en lugar del punto:
 * accionarlo tres veces seguidas mandaría tres cambios de estado y el que
 * acabara último decidiría el resultado.
 */

import { useAsyncAction } from './action-button';
import { useCopy } from '@/lib/i18n';
import { Spinner } from './spinner';

export function Toggle({
  checked,
  label,
  onChange,
}: {
  readonly checked: boolean;
  /** Qué se enciende. Lo lee quien navega sin ver la fila entera. */
  readonly label: string;
  readonly onChange: (next: boolean) => Promise<void> | void;
}): React.ReactElement {
  const copy = useCopy();

  const { isPending, run } = useAsyncAction();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-busy={isPending}
      disabled={isPending}
      onClick={() => void run(() => onChange(!checked))}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed ${
        checked ? 'bg-success' : 'bg-border-strong'
      }`}
    >
      {isPending ? (
        <span className="text-text-inverted absolute inset-0 inline-flex items-center justify-center">
          <Spinner className="h-3.5 w-3.5" />
        </span>
      ) : (
        <span
          aria-hidden="true"
          className={`bg-surface inline-block h-4 w-4 rounded-full shadow transition-transform ${
            checked ? 'translate-x-[1.125rem]' : 'translate-x-0.5'
          }`}
        />
      )}
      <span className="sr-only">
        {label}
        {isPending ? ` · ${copy.feedback.updating}` : ''}
      </span>
    </button>
  );
}

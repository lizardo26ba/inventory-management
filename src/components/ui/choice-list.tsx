/**
 * Lista de opciones entre las que se elige una, y al elegirla se sigue.
 *
 * Para cuando la decisión es el paso entero de la pantalla, como elegir en qué
 * empresa trabajar. Cada fila es un botón completo, no un enlace dentro de una
 * fila, para que el blanco sea grande en un teléfono y se recorra con el
 * tabulador de una en una.
 *
 * No sabe qué son las opciones: recibe el texto y las marcas ya resueltos.
 */

import { IconChevronDown } from './icons';

export type Choice = {
  readonly key: string;
  readonly title: string;
  readonly description?: string;
  /** Lo que identifica la opción de un vistazo, a la izquierda. */
  readonly leading?: React.ReactNode;
  /** Un dato de la opción que no es su nombre, a la derecha. */
  readonly meta?: React.ReactNode;
  readonly onSelect: () => void;
};

export function ChoiceList({
  label,
  choices,
}: {
  /** Qué se está eligiendo, para quien no ve la pantalla. */
  readonly label: string;
  readonly choices: readonly Choice[];
}): React.ReactElement {
  return (
    <ul
      aria-label={label}
      className="border-border bg-surface rounded-card divide-border divide-y overflow-hidden border"
    >
      {choices.map((choice) => (
        <li key={choice.key}>
          <button
            type="button"
            onClick={choice.onSelect}
            className="hover:bg-surface-muted flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
          >
            {choice.leading}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{choice.title}</span>
              {choice.description !== undefined ? (
                <span className="text-text-muted block truncate text-xs">
                  {choice.description}
                </span>
              ) : null}
            </span>
            {choice.meta}
            <IconChevronDown className="text-text-muted h-4 w-4 shrink-0 -rotate-90" />
          </button>
        </li>
      ))}
    </ul>
  );
}

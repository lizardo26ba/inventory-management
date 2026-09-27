'use client';

/**
 * El campo del código de un solo uso, una casilla por carácter.
 *
 * Una casilla por carácter deja ver de un vistazo cuánto falta y dónde está un
 * error de tecleo. El precio son tres cosas que un campo único trae gratis, y que
 * aquí se hacen a mano porque sin ellas las casillas estorban:
 *
 * - **Pegar.** Pegar el código entero en cualquier casilla lo reparte desde ahí.
 *   El autocompletado del teléfono llega igual, como un pegado en la primera.
 * - **Moverse.** Escribir avanza a la siguiente; borrar en una vacía vuelve a la
 *   anterior; las flechas mueven el foco.
 * - **Leerse.** El conjunto es un grupo con el nombre del campo, y cada casilla
 *   dice qué posición es. Sin eso, un lector de pantalla anuncia seis campos
 *   sin nombre.
 *
 * Solo entran letras y números. Los códigos de la app son solo cifras, y ahí se
 * descarta además toda letra y sale el teclado numérico. Los de respaldo llevan
 * letras, que se guardan en mayúscula.
 *
 * El valor es una cadena del largo del código, con un espacio en cada casilla
 * vacía. `isCodeComplete` dice si ya no queda ninguna.
 */

import { Fragment, useRef } from 'react';

import { inputBorderClass } from './form';

export type CodeCharset = 'digits' | 'alphanumeric';

const EMPTY = ' ';

const DISALLOWED: Record<CodeCharset, RegExp> = {
  digits: /[^0-9]/g,
  alphanumeric: /[^A-Z0-9]/g,
};

function keepAllowed(raw: string, charset: CodeCharset): string {
  return raw.toUpperCase().replace(DISALLOWED[charset], '');
}

/** Si todas las casillas tienen su carácter. */
export function isCodeComplete(value: string, length: number): boolean {
  return value.length === length && !value.includes(EMPTY);
}

export function OneTimeCodeField({
  id,
  value,
  onChange,
  length,
  charset,
  groupLabel,
  positionLabel,
  groupSize,
  hasError,
  describedBy,
}: {
  /** Va en la primera casilla, que es a donde lleva la etiqueta del campo. */
  readonly id: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly length: number;
  readonly charset: CodeCharset;
  /** El nombre del campo, para el grupo. */
  readonly groupLabel: string;
  /** Cómo se anuncia cada casilla: "Carácter 2 de 6". */
  readonly positionLabel: (position: number, total: number) => string;
  /**
   * Cada cuántas casillas va un separador. Solo es visual: los códigos de
   * respaldo se leen en dos grupos de cuatro, pero el guion no se escribe.
   */
  readonly groupSize?: number;
  readonly hasError: boolean;
  readonly describedBy?: string;
}): React.ReactElement {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = Array.from({ length }, (_, index) => {
    const char = value[index];
    return char === undefined || char === EMPTY ? '' : char;
  });

  function emit(next: readonly string[]): void {
    onChange(next.map((char) => (char === '' ? EMPTY : char)).join(''));
  }

  function focusAt(index: number): void {
    const target = inputs.current[Math.max(0, Math.min(length - 1, index))];
    target?.focus();
    target?.select();
  }

  function handleInput(index: number, raw: string): void {
    const typed = keepAllowed(raw, charset);
    const next = [...chars];

    if (typed === '') {
      // Lo escrito no era válido, o se borró: la casilla queda vacía y el foco
      // no se mueve.
      next[index] = '';
      emit(next);
      return;
    }

    // Uno o varios caracteres: se reparten desde esta casilla. Un solo carácter
    // es teclear; varios son pegar o el autocompletado del teléfono.
    const incoming = typed.slice(0, length - index).split('');
    incoming.forEach((char, offset) => {
      next[index + offset] = char;
    });
    emit(next);
    focusAt(index + incoming.length);
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Backspace' && chars[index] === '' && index > 0) {
      event.preventDefault();
      const next = [...chars];
      next[index - 1] = '';
      emit(next);
      focusAt(index - 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusAt(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusAt(index + 1);
    }
  }

  const isNumeric = charset === 'digits';

  return (
    <div
      role="group"
      aria-label={groupLabel}
      aria-describedby={describedBy}
      className="mt-1.5 flex items-center justify-center gap-1.5 sm:gap-2"
    >
      {chars.map((char, index) => {
        const startsGroup = groupSize !== undefined && index > 0 && index % groupSize === 0;

        return (
          <Fragment key={index}>
            {startsGroup ? (
              <span aria-hidden="true" className="text-text-muted shrink-0">
                –
              </span>
            ) : null}
            {/* Las casillas encogen para caber en un teléfono, hasta su ancho
                de escritorio y no más. Todas iguales: el guion va aparte. */}
            <input
              ref={(element) => {
                inputs.current[index] = element;
              }}
              id={index === 0 ? id : undefined}
              value={char}
              onChange={(event) => handleInput(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onFocus={(event) => event.target.select()}
              inputMode={isNumeric ? 'numeric' : 'text'}
              // Solo la primera recibe el código que propone el teléfono.
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              aria-label={positionLabel(index + 1, length)}
              aria-invalid={hasError}
              className={`rounded-control bg-surface h-12 w-full max-w-10 min-w-0 flex-1 border text-center font-mono text-xl uppercase ${inputBorderClass(hasError)}`}
            />
          </Fragment>
        );
      })}
    </div>
  );
}

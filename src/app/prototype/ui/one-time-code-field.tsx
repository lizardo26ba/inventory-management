'use client';

/**
 * El campo del código de un solo uso, una casilla por dígito.
 *
 * Una casilla por dígito deja ver de un vistazo cuánto falta y dónde está un
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
 * Solo entran cifras: lo demás se descarta al escribirlo, y sale el teclado
 * numérico.
 *
 * El valor es una cadena del largo del código, con un espacio en cada casilla
 * vacía. `isCodeComplete` dice si ya no queda ninguna.
 */

import { useRef } from 'react';

import { inputBorderClass } from './form';

const EMPTY = ' ';
const NOT_A_DIGIT = /[^0-9]/g;

/** Si todas las casillas tienen su dígito. */
export function isCodeComplete(value: string, length: number): boolean {
  return value.length === length && !value.includes(EMPTY);
}

export function OneTimeCodeField({
  id,
  value,
  onChange,
  length,
  groupLabel,
  positionLabel,
  hasError,
  describedBy,
}: {
  /** Va en la primera casilla, que es a donde lleva la etiqueta del campo. */
  readonly id: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly length: number;
  /** El nombre del campo, para el grupo. */
  readonly groupLabel: string;
  /** Cómo se anuncia cada casilla: "Dígito 2 de 6". */
  readonly positionLabel: (position: number, total: number) => string;
  readonly hasError: boolean;
  readonly describedBy?: string;
}): React.ReactElement {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, index) => {
    const digit = value[index];
    return digit === undefined || digit === EMPTY ? '' : digit;
  });

  function emit(next: readonly string[]): void {
    onChange(next.map((digit) => (digit === '' ? EMPTY : digit)).join(''));
  }

  function focusAt(index: number): void {
    const target = inputs.current[Math.max(0, Math.min(length - 1, index))];
    target?.focus();
    target?.select();
  }

  function handleInput(index: number, raw: string): void {
    const typed = raw.replace(NOT_A_DIGIT, '');
    const next = [...digits];

    if (typed === '') {
      // Lo escrito no era una cifra, o se borró: la casilla queda vacía y el
      // foco no se mueve.
      next[index] = '';
      emit(next);
      return;
    }

    // Una o varias cifras: se reparten desde esta casilla. Una sola es teclear;
    // varias son pegar o el autocompletado del teléfono.
    const incoming = typed.slice(0, length - index).split('');
    incoming.forEach((digit, offset) => {
      next[index + offset] = digit;
    });
    emit(next);
    focusAt(index + incoming.length);
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Backspace' && digits[index] === '' && index > 0) {
      event.preventDefault();
      const next = [...digits];
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

  return (
    <div
      role="group"
      aria-label={groupLabel}
      aria-describedby={describedBy}
      className="mt-1.5 flex items-center justify-center gap-1.5 sm:gap-2"
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputs.current[index] = element;
          }}
          id={index === 0 ? id : undefined}
          value={digit}
          onChange={(event) => handleInput(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onFocus={(event) => event.target.select()}
          inputMode="numeric"
          // Solo la primera recibe el código que propone el teléfono.
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={positionLabel(index + 1, length)}
          aria-invalid={hasError}
          // Encogen para caber en un teléfono, hasta su ancho de escritorio.
          className={`rounded-control bg-surface h-12 w-full max-w-10 min-w-0 flex-1 border text-center font-mono text-xl ${inputBorderClass(hasError)}`}
        />
      ))}
    </div>
  );
}

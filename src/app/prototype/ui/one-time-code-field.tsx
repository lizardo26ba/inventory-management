'use client';

/**
 * El campo del código de un solo uso.
 *
 * Es un solo campo y no seis cajas. Seis cajas obligan a mover el foco a mano,
 * rompen el pegado y el autocompletado del teléfono, y un lector de pantalla las
 * anuncia como seis campos sin nombre. Un campo grande con el texto espaciado se
 * ve igual de claro y no pierde nada de eso.
 *
 * `autocomplete="one-time-code"` deja que el teléfono proponga el código, y el
 * teclado numérico sale solo. Lo que no sea un dígito se descarta al escribir,
 * así que pegar "123 456" funciona.
 */

import { CONTROL_CLASS, inputBorderClass } from './form';

export function OneTimeCodeField({
  id,
  value,
  onChange,
  length,
  hasError,
  describedBy,
  numeric = true,
}: {
  readonly id: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
  /** Cuántos caracteres lleva el código. */
  readonly length: number;
  readonly hasError: boolean;
  readonly describedBy?: string;
  /**
   * Los códigos de la app son solo cifras. Los de respaldo llevan letras, y ahí
   * el teclado tiene que ser el de texto.
   */
  readonly numeric?: boolean;
}): React.ReactElement {
  function normalize(raw: string): string {
    const kept = numeric
      ? raw.replace(/\D/g, '')
      : raw.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    return kept.slice(0, length);
  }

  return (
    <input
      id={id}
      value={value}
      onChange={(event) => onChange(normalize(event.target.value))}
      inputMode={numeric ? 'numeric' : 'text'}
      autoComplete="one-time-code"
      autoCapitalize="characters"
      spellCheck={false}
      maxLength={length}
      aria-invalid={hasError}
      aria-describedby={describedBy}
      className={`${CONTROL_CLASS} mt-1.5 h-12 text-center font-mono text-xl tracking-[0.4em] ${inputBorderClass(hasError)}`}
    />
  );
}

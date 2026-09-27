'use client';

/**
 * Los códigos de respaldo, tal como se enseñan una sola vez.
 *
 * En rejilla de dos columnas y con letra de ancho fijo, porque se copian a mano o
 * se imprimen, y un carácter que baila hace que alguien confunda una O con un 0.
 * El botón de copiar los lleva todos, uno por línea, que es como se pegan en un
 * gestor de contraseñas.
 */

import { useState } from 'react';

import { buttonClass } from './button';

export function RecoveryCodes({
  codes,
  label,
  copyLabel,
  copiedLabel,
}: {
  readonly codes: readonly string[];
  readonly label: string;
  readonly copyLabel: string;
  readonly copiedLabel: string;
}): React.ReactElement {
  const [copied, setCopied] = useState(false);

  async function copyAll(): Promise<void> {
    try {
      await navigator.clipboard.writeText(codes.join('\n'));
      setCopied(true);
    } catch (error: unknown) {
      // Sin permiso para el portapapeles no se pierde nada: los códigos siguen en
      // pantalla para copiarlos a mano. Se deja constancia en la consola.
      console.error('No se pudieron copiar los códigos de respaldo.', error);
    }
  }

  return (
    <div className="border-border bg-surface-muted rounded-card border p-4">
      <ul aria-label={label} className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-sm">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void copyAll()}
          className={buttonClass({ variant: 'secondary', size: 'sm' })}
        >
          {copyLabel}
        </button>
        <span aria-live="polite" className="text-text-muted text-xs">
          {copied ? copiedLabel : ''}
        </span>
      </div>
    </div>
  );
}

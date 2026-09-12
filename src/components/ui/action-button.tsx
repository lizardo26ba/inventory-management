'use client';

/**
 * Botón de acción contra el servidor.
 *
 * Todo botón que escribe algo pasa por aquí. Tres cosas ocurren a la vez desde
 * el clic hasta la respuesta, y las tres son obligatorias:
 *
 * 1. El botón queda deshabilitado. Sin esto, tres clics impacientes son tres
 *    peticiones idénticas, y en una eliminación o un alta eso no es inofensivo:
 *    duplica registros o intenta borrar dos veces lo mismo.
 * 2. Aparece un indicador dentro del propio botón, donde está mirando quien lo
 *    pulsó.
 * 3. El botón se anuncia como ocupado con aria-busy, y el texto alternativo
 *    dice qué está pasando, porque el giro no lo ve todo el mundo.
 *
 * El indicador va a la derecha del texto, no encima. Tapar la etiqueta deja al
 * botón sin decir qué se está guardando justo cuando más importa saberlo, y en
 * una fila de botones iguales el que gira deja de ser reconocible.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { useCopy } from '@/lib/i18n';

import { buttonClass, type ButtonVariant } from './button';
import { Spinner } from './spinner';

export type ActionVariant = ButtonVariant;

/**
 * Ejecuta una operación asíncrona una sola vez a la vez.
 *
 * Sirve para los controles que no son un botón nuestro: el envío de un
 * formulario, un interruptor, una confirmación dentro de un diálogo.
 *
 * No actualiza el estado si el componente ya se desmontó, que es lo normal
 * cuando la operación termina navegando a otra pantalla.
 */
export function useAsyncAction(): {
  readonly isPending: boolean;
  readonly run: (operation: () => Promise<void> | void) => Promise<void>;
} {
  const [isPending, setIsPending] = useState(false);
  const isRunningRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const run = useCallback(async (operation: () => Promise<void> | void): Promise<void> => {
    // La guarda no es el estado sino la referencia: dos clics en el mismo
    // fotograma leerían el estado antiguo y pasarían los dos.
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setIsPending(true);

    try {
      await operation();
    } finally {
      isRunningRef.current = false;
      if (isMountedRef.current) setIsPending(false);
    }
  }, []);

  return { isPending, run };
}

export function ActionButton({
  children,
  onAction,
  type = 'button',
  variant = 'primary',
  isPending: controlledPending,
  disabled = false,
  pendingLabel,
  className = '',
}: {
  readonly children: React.ReactNode;
  /** La operación. Solo se omite en los botones de envío de un formulario. */
  readonly onAction?: () => Promise<void> | void;
  readonly type?: 'button' | 'submit';
  readonly variant?: ActionVariant;
  /** Espera gobernada desde fuera, para el envío de un formulario. */
  readonly isPending?: boolean;
  readonly disabled?: boolean;
  /** Qué se está haciendo. Lo lee quien no ve el indicador. Por defecto, que
   *  se está trabajando: sirve para cualquier acción. */
  readonly pendingLabel?: string;
  readonly className?: string;
}): React.ReactElement {
  const copy = useCopy();
  const action = useAsyncAction();
  const isPending = controlledPending ?? action.isPending;
  const isBlocked = isPending || disabled;

  return (
    <button
      type={type}
      disabled={isBlocked}
      aria-busy={isPending}
      onClick={onAction === undefined ? undefined : () => void action.run(onAction)}
      className={buttonClass({ variant, className })}
    >
      <span className="inline-flex items-center gap-2">{children}</span>

      {isPending ? (
        <>
          <Spinner />
          <span className="sr-only">{pendingLabel ?? copy.feedback.working}</span>
        </>
      ) : null}
    </button>
  );
}

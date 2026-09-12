'use client';

/**
 * Diálogo de confirmación.
 *
 * Escrito a mano, y es el componente más caro del prototipo. Un diálogo modal
 * no es una caja flotante: es una trampa de foco. Todo esto es obligatorio y
 * está aquí:
 *
 * - Al abrir, el foco entra en el diálogo, en la acción menos destructiva.
 * - El tabulador da vueltas dentro del diálogo y no se escapa al fondo.
 * - Escape cancela.
 * - Al cerrar, el foco vuelve exactamente a donde estaba.
 * - El fondo no se desplaza mientras el diálogo está abierto.
 * - Lleva role de diálogo, se anuncia como modal y su título lo nombra.
 *
 * Confirmar una acción destructiva nunca es el botón que recibe el foco. Quien
 * pulsa Enter por inercia debe cancelar, no borrar.
 *
 * Confirmar escribe en la base, así que mientras la operación viaja el diálogo
 * se queda: el botón gira, cancelar se bloquea y ni Escape ni el clic en el
 * fondo lo cierran. Cerrarlo a media escritura dejaría la pantalla diciendo que
 * no pasó nada mientras pasaba.
 */

import { useEffect, useId, useRef } from 'react';

import { useAsyncAction } from './action-button';
import { buttonClass } from './button';
import { useCopy } from '@/lib/i18n';
import { Spinner } from './spinner';

const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input, select, textarea';

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel,
  isDestructive = false,
  onConfirm,
  onCancel,
}: {
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly isDestructive?: boolean;
  readonly onConfirm: () => Promise<void> | void;
  readonly onCancel: () => void;
}): React.ReactElement {
  const copy = useCopy();

  const titleId = useId();
  const descriptionId = useId();
  const { isPending, run } = useAsyncAction();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    cancelRef.current?.focus({ preventScroll: true });
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, []);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (!isPending) onCancel();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={isPending ? undefined : onCancel}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={onKeyDown}
        className="border-border bg-surface rounded-card relative w-full max-w-sm border p-5 shadow-xl"
      >
        <h2 id={titleId} className="text-base font-semibold">
          {title}
        </h2>
        <p id={descriptionId} className="text-text-muted mt-2 text-sm leading-relaxed">
          {description}
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className={buttonClass({ variant: 'secondary', size: 'sm' })}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => void run(onConfirm)}
            disabled={isPending}
            aria-busy={isPending}
            className={buttonClass({
              variant: isDestructive ? 'danger' : 'primary',
              size: 'sm',
            })}
          >
            {confirmLabel}
            {isPending ? (
              <>
                <Spinner />
                <span className="sr-only">{copy.feedback.working}</span>
              </>
            ) : null}
          </button>
        </div>
      </div>
    </div>
  );
}

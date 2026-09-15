'use client';

/**
 * Panel lateral modal.
 *
 * Nació dentro del detalle de la bitácora, que era el único que lo dibujaba. Vive
 * aquí para que la pantalla real lo reciba hecho y para que el siguiente detalle
 * no lo vuelva a escribir.
 *
 * Se cierra con una dirección y no con una función. Lo que se abre desde la
 * dirección se cierra volviendo a ella, y una dirección cruza la frontera del
 * servidor al cliente mientras que una función no: así una pantalla de servidor
 * lo abre sin tener que envolverlo en un componente de cliente propio.
 *
 * Es modal, así que cumple lo mismo que el diálogo de confirmación: el foco
 * entra, el tabulador da vueltas dentro, Escape cierra y el foco vuelve a donde
 * estaba. El fondo no se desplaza mientras está abierto.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef } from 'react';

import { IconClose } from './icons';

const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input, select, textarea';

export function SidePanel({
  eyebrow,
  title,
  subtitle,
  closeHref,
  closeLabel,
  footer,
  children,
}: {
  /** La línea pequeña encima del título, que dice qué clase de cosa se mira. */
  readonly eyebrow?: string;
  readonly title: string;
  readonly subtitle?: React.ReactNode;
  /** A dónde vuelve la pantalla al cerrar: la misma dirección, sin el panel. */
  readonly closeHref: string;
  readonly closeLabel: string;
  readonly footer?: React.ReactNode;
  readonly children: React.ReactNode;
}): React.ReactElement {
  const router = useRouter();

  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    closeRef.current?.focus({ preventScroll: true });
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, []);

  function close(): void {
    router.replace(closeHref as never, { scroll: false });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
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
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={close} aria-hidden="true" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        className="border-border bg-surface relative flex h-full w-full max-w-md flex-col border-l shadow-xl"
      >
        <div className="border-border flex items-start justify-between gap-4 border-b px-5 py-4">
          <div className="min-w-0">
            {eyebrow !== undefined ? (
              <p className="text-text-muted text-xs">{eyebrow}</p>
            ) : null}
            <h2 id={titleId} className="mt-0.5 text-base font-semibold">
              {title}
            </h2>
            {subtitle !== undefined ? (
              <div className="text-text-muted mt-0.5 text-xs">{subtitle}</div>
            ) : null}
          </div>
          <Link
            ref={closeRef}
            href={closeHref as never}
            replace
            scroll={false}
            className="hover:bg-surface-muted text-text-muted hover:text-text rounded-control shrink-0 p-1.5 transition-colors"
          >
            <IconClose className="h-4 w-4" />
            <span className="sr-only">{closeLabel}</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-2">{children}</div>

        {footer !== undefined ? (
          <div className="border-border text-text-muted border-t px-5 py-3 text-xs">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

'use client';

/**
 * El diálogo que dice cómo terminó una acción que no cambia de pantalla.
 *
 * Suspender, reactivar, eliminar o restablecer se hacen desde una lista o una
 * ficha, y la pantalla sigue siendo la misma después. Sin un aviso claro, el
 * resultado se adivina mirando si una fila cambió de color. Este diálogo lo dice
 * en palabras, y en tres tonos:
 *
 * - **Éxito:** se hizo.
 * - **Error:** no se hizo, y por qué.
 * - **Advertencia:** no se hizo, pero no es un fallo: alguien cambió el registro
 *   antes, o no había nada que hacer. Hay que mirar antes de repetir.
 *
 * El título es genérico por tono y el texto dice qué acción y sobre qué
 * registro. Así el título se reconoce de un vistazo y el texto no deja dudas.
 *
 * No se usa para los errores de un campo de formulario, que van junto al campo,
 * ni para las acciones que navegan: la pantalla nueva ya es la respuesta.
 *
 * Se abre desde cualquier sitio con `useResultDialog`, y el texto lo arma
 * `resultMessageFor` a partir de lo que devolvió la Server Action. Es modal con una sola
 * salida: el foco entra en "Entendido", Escape y el fondo también cierran, y al
 * cerrar el foco vuelve a donde estaba.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import type { ErrorPayload } from '@/lib/errors';
import { useCopy, type Copy } from '@/lib/i18n';
import { errorReason } from '@/lib/i18n/error-reason';
import { buttonClass } from './button';
import { IconAlert, IconCheck } from './icons';

export type ResultTone = 'success' | 'error' | 'warning';

export type ResultMessage = {
  readonly tone: ResultTone;
  /** Qué acción y sobre qué registro, en una frase. En el error, también por qué. */
  readonly message: string;
};

const TONE_STYLE = {
  success: { badge: 'bg-success-soft text-success', Icon: IconCheck },
  error: { badge: 'bg-danger-soft text-danger', Icon: IconAlert },
  warning: { badge: 'bg-warning-soft text-warning', Icon: IconAlert },
} as const;

function ResultDialog({
  result,
  onClose,
}: {
  readonly result: ResultMessage;
  readonly onClose: () => void;
}): React.ReactElement {
  const copy = useCopy();
  const titleId = useId();
  const messageId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  const title = {
    success: copy.result.successTitle,
    error: copy.result.errorTitle,
    warning: copy.result.warningTitle,
  }[result.tone];
  const { badge, Icon } = TONE_STYLE[result.tone];

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      <div
        // Un error o una advertencia interrumpen: se anuncian como alerta.
        role={result.tone === 'success' ? 'dialog' : 'alertdialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        onKeyDown={(event) => {
          if (event.key === 'Escape' || event.key === 'Tab') {
            event.preventDefault();
            if (event.key === 'Escape') onClose();
          }
        }}
        className="border-border bg-surface rounded-card relative w-full max-w-sm border p-5 text-center shadow-xl"
      >
        <span
          className={`mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full ${badge}`}
        >
          <Icon className="h-6 w-6" />
        </span>
        <h2 id={titleId} className="mt-3 text-base font-semibold">
          {title}
        </h2>
        <p id={messageId} className="text-text-muted mt-2 text-sm leading-relaxed">
          {result.message}
        </p>

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className={buttonClass({ size: 'sm', className: 'mt-5 w-full' })}
        >
          {copy.result.close}
        </button>
      </div>
    </div>
  );
}

const ResultDialogContext = createContext<((result: ResultMessage) => void) | null>(null);

/** Pone el diálogo al alcance de toda la pantalla. Uno a la vez: el último manda. */
export function ResultDialogProvider({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  const [result, setResult] = useState<ResultMessage | null>(null);
  const close = useCallback(() => setResult(null), []);

  return (
    <ResultDialogContext.Provider value={setResult}>
      {children}
      {result !== null ? <ResultDialog result={result} onClose={close} /> : null}
    </ResultDialogContext.Provider>
  );
}

/** Abre el diálogo de resultado. */
export function useResultDialog(): (result: ResultMessage) => void {
  const show = useContext(ResultDialogContext);
  if (show === null) {
    throw new Error('useResultDialog necesita estar dentro de ResultDialogProvider.');
  }
  return show;
}

/** Las acciones que avisan de su resultado. Cada una tiene sus frases en `copy.result`. */
export type ResultAction =
  | 'userSuspend'
  | 'userActivate'
  | 'userDelete'
  | 'companySuspend'
  | 'companyActivate'
  | 'companyDelete'
  | 'twoFactorReset';

type ActionOutcome =
  { readonly ok: true } | { readonly ok: false; readonly error: ErrorPayload };

/**
 * El mensaje de una acción ya terminada: qué se hizo, sobre qué registro, y la
 * consecuencia o el motivo.
 *
 * El tono sale del código que devolvió el servidor, no de quien llama:
 *
 * - Otra persona cambió el registro, o ya no existe: advertencia. No es un
 *   fallo de nadie, pero hay que mirar antes de repetir.
 * - Un campo rechazado: error, con el motivo de ese campo. Así llega, por
 *   ejemplo, que nadie restablece su propio segundo factor.
 * - Todo lo demás: error, con el motivo de siempre para ese código.
 */
export function resultMessageFor(
  copy: Copy,
  action: ResultAction,
  name: string,
  outcome: ActionOutcome,
): ResultMessage {
  if (outcome.ok) {
    return {
      tone: 'success',
      message: `${copy.result[`${action}Done`]} ${name}. ${copy.result[`${action}Consequence`]}`,
    };
  }

  const failed = `${copy.result[`${action}Failed`]} ${name}.`;
  const { code, fieldErrors } = outcome.error;

  if (code === 'STALE_VERSION' || code === 'CONFLICT') {
    return { tone: 'warning', message: `${failed} ${copy.result.changedMeanwhile}` };
  }
  if (code === 'NOT_FOUND') {
    return { tone: 'warning', message: `${failed} ${copy.errors.notFound}` };
  }

  const fieldKey = fieldErrors === undefined ? undefined : Object.values(fieldErrors)[0];
  const fieldMessage =
    fieldKey === undefined
      ? undefined
      : copy.fieldErrors[fieldKey as keyof Copy['fieldErrors']];

  return { tone: 'error', message: `${failed} ${fieldMessage ?? errorReason(copy, code)}` };
}

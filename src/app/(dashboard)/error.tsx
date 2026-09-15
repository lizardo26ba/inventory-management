'use client';

/**
 * Lo que se ve cuando una pantalla del panel no llega a abrirse.
 *
 * Antes no existía este archivo y el hueco se notaba: un rechazo de permiso
 * subía sin que nadie lo recogiera y la persona acababa en la pantalla de fallo
 * de Next.js, en inglés y sin explicación, después de pulsar una opción del
 * menú. El principio 6 de CLAUDE.md pide lo contrario, y RN-013 exige que ese
 * texto sea una clave traducible y no una frase redactada en el servidor.
 *
 * Vive en el grupo y no en cada pantalla por la misma razón que la guarda de
 * sesión vive en el diseño del grupo: una pantalla nueva queda cubierta por
 * nacer aquí dentro, no por acordarse de nada.
 *
 * Es de cliente porque así lo exige un límite de error, y porque `reset` solo
 * tiene sentido en el navegador. El registro del fallo ya ocurrió en el
 * servidor, donde estaba la causa completa; aquí solo queda decirlo.
 */

import Link from 'next/link';
import { useEffect } from 'react';

import { buttonClass } from '@/components/ui/button';
import { EMPTY_STATE_LINK_CLASS, EmptyState } from '@/components/ui/empty-state';
import { SIGN_IN_PATH, SIGNED_IN_PATH } from '@/modules/auth/routes';
import { useCopy, type Copy } from '@/lib/i18n';

/**
 * Qué ofrecer como salida.
 *
 * No siempre es reintentar. Ante un permiso que falta, el mismo botón llevaría
 * al mismo rechazo una y otra vez, y eso enseña a la persona que el producto no
 * responde. Cuando no hay nada que reintentar, la salida es irse a donde sí se
 * puede estar.
 */
type Exit = 'retry' | 'signIn' | 'home';

type Presentation = {
  readonly title: string;
  readonly message: string;
  readonly exit: Exit;
};

/**
 * El código del error viaja en `digest`, que es lo único que Next.js deja pasar
 * del servidor a este límite. Lo pone `AppError`; ver `src/lib/errors/index.ts`.
 *
 * Un código que no esté en esta tabla se presenta como fallo genérico. Es
 * deliberado: un error interno no se le explica a quien lo encuentra, porque su
 * detalle es asunto del registro del servidor y no suyo.
 */
function present(copy: Copy, digest: string | undefined): Presentation {
  switch (digest) {
    case 'NOT_AUTHORIZED':
      return {
        title: copy.errorPage.notAuthorizedTitle,
        message: copy.errors.notAuthorized,
        exit: 'home',
      };
    case 'NOT_AUTHENTICATED':
      return {
        title: copy.errorPage.sessionExpiredTitle,
        message: copy.errors.sessionExpired,
        exit: 'signIn',
      };
    case 'TWO_FACTOR_REQUIRED':
      return {
        title: copy.errorPage.twoFactorTitle,
        message: copy.errors.twoFactorRequired,
        exit: 'home',
      };
    case 'NOT_FOUND':
      return {
        title: copy.errorPage.genericTitle,
        message: copy.errors.notFound,
        exit: 'retry',
      };
    case 'TOO_MANY_ATTEMPTS':
      return {
        title: copy.errorPage.genericTitle,
        message: copy.errors.tooManyAttempts,
        exit: 'retry',
      };
    case 'STALE_VERSION':
      return {
        title: copy.errorPage.genericTitle,
        message: copy.errors.staleVersion,
        exit: 'retry',
      };
    default:
      return {
        title: copy.errorPage.genericTitle,
        message: copy.errors.generic,
        exit: 'retry',
      };
  }
}

export default function DashboardError({
  error,
  reset,
}: {
  readonly error: Error & { readonly digest?: string };
  readonly reset: () => void;
}): React.ReactElement {
  const copy = useCopy();
  const { title, message, exit } = present(copy, error.digest);

  // Nada silencioso, principio 6. Un fallo del servidor ya quedó registrado allí
  // con su causa; esto cubre el que nazca en el navegador, que de otro modo no
  // dejaría rastro en ninguna parte.
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState title={title} message={message}>
      {exit === 'retry' ? (
        <button type="button" onClick={reset} className={buttonClass({ size: 'sm' })}>
          {copy.errorPage.retry}
        </button>
      ) : null}

      {exit === 'signIn' ? (
        <Link href={SIGN_IN_PATH} className={EMPTY_STATE_LINK_CLASS}>
          {copy.errorPage.signIn}
        </Link>
      ) : null}

      {exit === 'home' ? (
        <Link href={SIGNED_IN_PATH} className={EMPTY_STATE_LINK_CLASS}>
          {copy.notFoundPage.back}
        </Link>
      ) : null}
    </EmptyState>
  );
}

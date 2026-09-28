'use client';

/**
 * El segundo factor de un super administrador, visto por otro. RN-005, ADR 0014.
 *
 * Dos cosas en un solo bloque: en qué estado está, y la salida para quien perdió
 * el teléfono. Van juntas porque la segunda solo tiene sentido leyendo la
 * primera: restablecer un factor que nunca se activó no hace nada.
 *
 * El botón es secundario y no rojo, aunque la confirmación sí avise en serio. No
 * borra datos de negocio: devuelve la cuenta al alta, y la persona vuelve a
 * entrar con su contraseña y su teléfono nuevo. El peligro real es hacerlo sin
 * haber hablado con ella, y eso es lo que dice la confirmación.
 *
 * Nadie se restablece a sí mismo. En la propia cuenta el botón no aparece y se
 * dice por qué; el servidor lo rechaza igual si alguien invoca la acción.
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { buttonClass } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Notice } from '@/components/ui/notice';
import { Tag } from '@/components/ui/tag';
import { useCopy } from '@/lib/i18n';
import { errorReason } from '@/lib/i18n/error-reason';

import { resetTwoFactor } from '../actions';
import type { TwoFactorStatus } from '../types';

export function TwoFactorStatusPanel({
  userId,
  fullName,
  status,
  isSelf,
}: {
  readonly userId: string;
  readonly fullName: string;
  readonly status: TwoFactorStatus;
  readonly isSelf: boolean;
}): React.ReactElement {
  const copy = useCopy();
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [wasReset, setWasReset] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const label = {
    ACTIVE: copy.userForm.twoFactorActive,
    PENDING: copy.userForm.twoFactorPending,
    NONE: copy.userForm.twoFactorNone,
  }[status];

  const help = {
    ACTIVE: copy.userForm.twoFactorActiveHelp,
    PENDING: copy.userForm.twoFactorPendingHelp,
    NONE: copy.userForm.twoFactorNoneHelp,
  }[status];

  async function confirmReset(): Promise<void> {
    const result = await resetTwoFactor({ id: userId });
    setIsConfirming(false);

    if (result.ok) {
      setFailure(null);
      setWasReset(true);
      // El estado nuevo lo trae el servidor, no se supone aquí.
      router.refresh();
      return;
    }

    setWasReset(false);
    const fieldError = result.error.fieldErrors?.id;
    setFailure(
      fieldError === 'cannotResetOwnTwoFactor'
        ? copy.fieldErrors.cannotResetOwnTwoFactor
        : errorReason(copy, result.error.code),
    );
  }

  return (
    <div className="border-border border-t pt-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            {copy.userForm.twoFactorTitle}
            <Tag>{label}</Tag>
          </p>
          <p className="text-text-muted mt-1 text-xs">{help}</p>
        </div>

        {status !== 'NONE' && !isSelf ? (
          <button
            type="button"
            onClick={() => setIsConfirming(true)}
            className={buttonClass({ variant: 'secondary', size: 'sm', className: 'shrink-0' })}
          >
            {copy.userForm.twoFactorReset}
          </button>
        ) : null}
      </div>

      {status !== 'NONE' && isSelf ? (
        <p className="text-text-muted mt-2 text-xs">
          {copy.fieldErrors.cannotResetOwnTwoFactor}
        </p>
      ) : null}

      {wasReset ? (
        <div className="mt-3">
          <Notice tone="info">{copy.userForm.twoFactorResetDone}</Notice>
        </div>
      ) : null}

      {failure !== null ? (
        <p role="alert" className="text-danger mt-2 text-xs">
          {failure}
        </p>
      ) : null}

      {isConfirming ? (
        <ConfirmDialog
          title={copy.userForm.twoFactorResetTitle}
          description={`${fullName}. ${copy.userForm.twoFactorResetWarning}`}
          confirmLabel={copy.userForm.twoFactorResetConfirm}
          cancelLabel={copy.userForm.twoFactorResetCancel}
          isDestructive
          onCancel={() => setIsConfirming(false)}
          // Se cierra cuando el restablecimiento termina, no al pulsar.
          onConfirm={confirmReset}
        />
      ) : null}
    </div>
  );
}

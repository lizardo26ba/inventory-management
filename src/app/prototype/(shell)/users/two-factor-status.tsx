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
 * Nadie se restablece a sí mismo: eso anularía el factor para quien solo tiene
 * la contraseña. En la propia cuenta el botón no aparece y se dice por qué.
 */

import { useState } from 'react';

import { useCopy } from '@/lib/i18n';
import { useSessionStore } from '../../session-store';
import { buttonClass } from '../../ui/button';
import { ConfirmDialog } from '../../ui/confirm-dialog';
import { Tag } from '../../ui/tag';
import { reportResult } from '../../report-result';
import { useResultDialog } from '../../ui/result-dialog';
import { useUserStore } from '../../user-store';
import type { TwoFactorStatus } from '../../users-data';

export function TwoFactorStatusPanel({
  userId,
}: {
  readonly userId: string;
}): React.ReactElement {
  const copy = useCopy();
  const { account } = useSessionStore();
  const { findById, resetTwoFactor } = useUserStore();
  const [isConfirming, setIsConfirming] = useState(false);
  const showResult = useResultDialog();

  const user = findById(userId);
  const status: TwoFactorStatus = user?.twoFactor ?? 'none';
  const isSelf = user?.email === account.email;
  const fullName = user === undefined ? '' : `${user.firstName} ${user.lastName}`;

  const label = {
    active: copy.userForm.twoFactorActive,
    pending: copy.userForm.twoFactorPending,
    none: copy.userForm.twoFactorNone,
  }[status];

  const help = {
    active: copy.userForm.twoFactorActiveHelp,
    pending: copy.userForm.twoFactorPendingHelp,
    none: copy.userForm.twoFactorNoneHelp,
  }[status];

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

        {status !== 'none' && !isSelf ? (
          <button
            type="button"
            onClick={() => setIsConfirming(true)}
            className={buttonClass({ variant: 'secondary', size: 'sm', className: 'shrink-0' })}
          >
            {copy.userForm.twoFactorReset}
          </button>
        ) : null}
      </div>

      {status !== 'none' && isSelf ? (
        <p className="text-text-muted mt-2 text-xs">
          {copy.fieldErrors.cannotResetOwnTwoFactor}
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
          onConfirm={async () => {
            await reportResult(showResult, copy, 'twoFactorReset', fullName, () =>
              resetTwoFactor(userId),
            );
            setIsConfirming(false);
          }}
        />
      ) : null}
    </div>
  );
}

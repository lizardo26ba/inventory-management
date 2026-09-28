'use client';

/**
 * Lo interactivo de una fila de la lista de usuarios.
 *
 * Dos hojas de cliente dentro de una tabla que se renderiza en el servidor: el
 * interruptor de estado y el menú de acciones. El resto de la fila es texto ya
 * resuelto y no viaja al navegador.
 *
 * Ninguna decide nada. Llaman a la Server Action, que es la que comprueba el
 * permiso, y pintan lo que responda. Que el menú esté a la vista no autoriza
 * nada; esconderlo tampoco protegería.
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { IconPencil, IconTrash } from '@/components/ui/icons';
import { RowMenu, type RowMenuAction } from '@/components/ui/row-menu';
import { Toggle } from '@/components/ui/toggle';
import { resultMessageFor, useResultDialog } from '@/components/ui/result-dialog';
import { useCopy } from '@/lib/i18n';

import { deleteUser, setUserActive } from '../actions';
import { userEditPath } from '../routes';

export function UserStatusToggle({
  id,
  name,
  isActive,
}: {
  readonly id: string;
  readonly name: string;
  readonly isActive: boolean;
}): React.ReactElement {
  const copy = useCopy();
  const showResult = useResultDialog();

  return (
    <div>
      <span className="flex items-center gap-2">
        <Toggle
          checked={isActive}
          label={`${copy.users.toggleActive} · ${name}`}
          onChange={async (next) => {
            const result = await setUserActive({ id, isActive: next });
            // La fila la vuelve a pintar el servidor al revalidar. Si falló, se
            // queda como estaba y el diálogo dice por qué, en lugar de mentir
            // con el color.
            showResult(
              resultMessageFor(copy, next ? 'userActivate' : 'userSuspend', name, result),
            );
          }}
        />
        <span className={`text-xs ${isActive ? 'text-success' : 'text-text-muted'}`}>
          {isActive ? copy.status.active : copy.status.inactive}
        </span>
      </span>
    </div>
  );
}

export function UserRowMenu({
  id,
  name,
}: {
  readonly id: string;
  readonly name: string;
}): React.ReactElement {
  const copy = useCopy();
  const router = useRouter();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const showResult = useResultDialog();

  const actions: readonly RowMenuAction[] = [
    {
      label: copy.users.edit,
      Icon: IconPencil,
      onSelect: () => router.push(userEditPath(id)),
    },
    {
      label: copy.users.delete,
      Icon: IconTrash,
      isDestructive: true,
      onSelect: () => setIsConfirmingDelete(true),
    },
  ];

  return (
    <div className="flex flex-col items-end">
      <RowMenu label={`${copy.users.rowMenu} · ${name}`} actions={actions} />

      {isConfirmingDelete ? (
        <ConfirmDialog
          title={copy.users.deleteTitle}
          description={`${name}. ${copy.users.deleteWarning}`}
          confirmLabel={copy.users.deleteConfirm}
          cancelLabel={copy.users.deleteCancel}
          isDestructive
          onCancel={() => setIsConfirmingDelete(false)}
          // Se cierra cuando la eliminación termina, no al pulsar. Cerrarlo antes
          // dejaría la fila a la vista como si no hubiera pasado nada.
          onConfirm={async () => {
            const result = await deleteUser({ id });
            setIsConfirmingDelete(false);
            showResult(resultMessageFor(copy, 'userDelete', name, result));
          }}
        />
      ) : null}
    </div>
  );
}

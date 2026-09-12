'use client';

/**
 * Menú de acciones de una fila de usuario.
 *
 * La mecánica del menú vive en la pieza de interfaz. Aquí queda lo que es de
 * usuarios: editar y eliminar.
 *
 * Eliminar abre confirmación porque quita el acceso a todas las empresas de
 * golpe, y quien lo pulsa desde una lista no ve a cuántas.
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ConfirmDialog } from '../../ui/confirm-dialog';
import { useCopy } from '@/lib/i18n';
import { IconPencil, IconTrash } from '../../ui/icons';
import { RowMenu } from '../../ui/row-menu';
import { useUserStore } from '../../user-store';
import { type User } from '../../users-data';

export function UserRowMenu({ user }: { readonly user: User }): React.ReactElement {
  const copy = useCopy();

  const router = useRouter();
  const { deleteUser } = useUserStore();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <>
      <RowMenu
        label={`${copy.users.rowMenu} · ${fullName}`}
        actions={[
          {
            label: copy.users.edit,
            Icon: IconPencil,
            onSelect: () => router.push(`/prototype/users/${user.id}/edit` as never),
          },
          {
            label: copy.users.delete,
            Icon: IconTrash,
            isDestructive: true,
            onSelect: () => setIsConfirmingDelete(true),
          },
        ]}
      />

      {isConfirmingDelete ? (
        <ConfirmDialog
          title={copy.users.deleteTitle}
          description={`${fullName}. ${copy.users.deleteWarning}`}
          confirmLabel={copy.users.deleteConfirm}
          cancelLabel={copy.users.deleteCancel}
          isDestructive
          onCancel={() => setIsConfirmingDelete(false)}
          // Se cierra cuando la eliminación termina, no al pulsar.
          onConfirm={async () => {
            await deleteUser(user.id);
            setIsConfirmingDelete(false);
          }}
        />
      ) : null}
    </>
  );
}

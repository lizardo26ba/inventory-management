'use client';

/**
 * Lo interactivo de una fila de la lista de empresas.
 *
 * Son dos hojas de cliente dentro de una tabla que se renderiza en el servidor:
 * el interruptor de estado y el menú de acciones. Todo lo demás de la fila es
 * texto ya resuelto y no viaja al navegador.
 *
 * Ninguna de las dos decide nada. Llaman a la Server Action, que es la que
 * comprueba el permiso, y pintan lo que responda. Que el menú esté a la vista no
 * autoriza nada; esconderlo tampoco protegería.
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { IconEye, IconPencil, IconTrash } from '@/components/ui/icons';
import { RowMenu, type RowMenuAction } from '@/components/ui/row-menu';
import { Toggle } from '@/components/ui/toggle';
import { type ErrorPayload } from '@/lib/errors';
import { useCopy, type Copy } from '@/lib/i18n';

import { deleteOrganization, setOrganizationActive } from '../actions';
import { organizationPath } from '../routes';

/**
 * El aviso cuando la escritura falla. Un fallo se ve, nunca se traga.
 *
 * La celda del estado no permite salto de línea, para que el interruptor y su
 * palabra no se separen. Aquí hay que devolverlo: un mensaje de una sola línea
 * ensancharía la columna y empujaría la tabla a desplazarse en horizontal.
 */
function RowError({ message }: { readonly message: string }): React.ReactElement {
  return (
    <p role="alert" className="text-danger mt-1 max-w-[14rem] text-xs whitespace-normal">
      {message}
    </p>
  );
}

function messageFor(error: ErrorPayload, copy: Copy): string {
  switch (error.code) {
    case 'NOT_AUTHORIZED':
    case 'TWO_FACTOR_REQUIRED':
      return copy.errors.notAuthorized;
    case 'NOT_AUTHENTICATED':
      return copy.errors.sessionExpired;
    case 'NOT_FOUND':
      return copy.errors.notFound;
    default:
      return copy.errors.generic;
  }
}

export function OrganizationStatusToggle({
  id,
  name,
  isActive,
}: {
  readonly id: string;
  readonly name: string;
  readonly isActive: boolean;
}): React.ReactElement {
  const copy = useCopy();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <span className="flex items-center gap-2">
        <Toggle
          checked={isActive}
          label={`${copy.organizations.toggleActive} · ${name}`}
          onChange={async (next) => {
            setError(null);
            const result = await setOrganizationActive({ id, isActive: next });
            // La fila la vuelve a pintar el servidor al revalidar. Si falló, se
            // queda como estaba y lo dice, en lugar de mentir con el color.
            if (!result.ok) setError(messageFor(result.error, copy));
          }}
        />
        <span className={`text-xs ${isActive ? 'text-success' : 'text-text-muted'}`}>
          {isActive ? copy.status.active : copy.status.inactive}
        </span>
      </span>
      {error !== null ? <RowError message={error} /> : null}
    </div>
  );
}

export function OrganizationRowMenu({
  id,
  slug,
  name,
}: {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
}): React.ReactElement {
  const copy = useCopy();
  const router = useRouter();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detailPath = organizationPath(slug);

  const actions: readonly RowMenuAction[] = [
    {
      label: copy.organizations.viewDetails,
      Icon: IconEye,
      onSelect: () => router.push(detailPath),
    },
    {
      label: copy.organizations.edit,
      Icon: IconPencil,
      onSelect: () => router.push(`${detailPath}/edit`),
    },
    {
      label: copy.organizations.delete,
      Icon: IconTrash,
      isDestructive: true,
      onSelect: () => setIsConfirmingDelete(true),
    },
  ];

  return (
    <div className="flex flex-col items-end">
      <RowMenu label={`${copy.organizations.rowMenu} · ${name}`} actions={actions} />

      {error !== null ? <RowError message={error} /> : null}

      {isConfirmingDelete ? (
        <ConfirmDialog
          title={copy.organizations.deleteTitle}
          description={`${name}. ${copy.organizations.deleteWarning}`}
          confirmLabel={copy.organizations.deleteConfirm}
          cancelLabel={copy.organizations.deleteCancel}
          isDestructive
          onCancel={() => setIsConfirmingDelete(false)}
          // El diálogo no se cierra al pulsar: se cierra cuando la eliminación
          // termina. Cerrarlo antes dejaría la fila a la vista como si no
          // hubiera pasado nada.
          onConfirm={async () => {
            setError(null);
            const result = await deleteOrganization({ id });
            setIsConfirmingDelete(false);
            if (!result.ok) setError(messageFor(result.error, copy));
          }}
        />
      ) : null}
    </div>
  );
}

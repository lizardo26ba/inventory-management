'use client';

/**
 * Menú de acciones de una fila de empresa.
 *
 * La mecánica del menú, con su foco, sus flechas y su recolocación al
 * desplazar, vive en la pieza de interfaz. Aquí queda solo lo que es de
 * empresas: qué acciones hay, a dónde llevan y qué se confirma.
 *
 * Eliminar abre confirmación porque se lleva por delante los almacenes y el
 * acceso de todo el mundo a esa empresa.
 */

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ConfirmDialog } from '../../ui/confirm-dialog';
import { useCompanyStore } from '../../company-store';
import { useCopy } from '@/lib/i18n';
import { type Company } from '../../fake-data';
import { IconEye, IconPencil, IconTrash } from '../../ui/icons';
import { RowMenu } from '../../ui/row-menu';

export function CompanyRowMenu({ company }: { readonly company: Company }): React.ReactElement {
  const copy = useCopy();

  const router = useRouter();
  const { deleteCompany } = useCompanyStore();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  return (
    <>
      <RowMenu
        label={`${copy.organizations.rowMenu} · ${company.name}`}
        actions={[
          {
            label: copy.organizations.viewDetails,
            Icon: IconEye,
            onSelect: () => router.push(`/prototype/organizations/${company.id}` as never),
          },
          {
            label: copy.organizations.edit,
            Icon: IconPencil,
            onSelect: () => router.push(`/prototype/organizations/${company.id}/edit` as never),
          },
          {
            label: copy.organizations.delete,
            Icon: IconTrash,
            isDestructive: true,
            onSelect: () => setIsConfirmingDelete(true),
          },
        ]}
      />

      {isConfirmingDelete ? (
        <ConfirmDialog
          title={copy.organizations.deleteTitle}
          description={`${company.name}. ${copy.organizations.deleteWarning}`}
          confirmLabel={copy.organizations.deleteConfirm}
          cancelLabel={copy.organizations.deleteCancel}
          isDestructive
          onCancel={() => setIsConfirmingDelete(false)}
          // El diálogo no se cierra al pulsar: se cierra cuando la eliminación
          // termina. Cerrarlo antes dejaría la fila a la vista como si no
          // hubiera pasado nada.
          onConfirm={async () => {
            await deleteCompany(company.id);
            setIsConfirmingDelete(false);
          }}
        />
      ) : null}
    </>
  );
}

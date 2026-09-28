'use client';

import { useState } from 'react';

import { IconEye, IconPencil, IconTrash } from '@/components/ui/icons';
import { RowMenu, type RowMenuAction } from '@/components/ui/row-menu';

export function RowMenuDemo(): React.ReactElement {
  const [chosen, setChosen] = useState<string | null>(null);

  const actions: readonly RowMenuAction[] = [
    { label: 'Ver ficha', Icon: IconEye, onSelect: () => setChosen('Ver ficha') },
    { label: 'Editar', Icon: IconPencil, onSelect: () => setChosen('Editar') },
    {
      label: 'Eliminar',
      Icon: IconTrash,
      isDestructive: true,
      onSelect: () => setChosen('Eliminar'),
    },
  ];

  return (
    <div className="flex items-center gap-4">
      <RowMenu label="Acciones de Guantes de nitrilo, talla M" actions={actions} />
      <p className="text-text-muted text-sm" aria-live="polite">
        {chosen === null ? 'Abre el menú.' : `Elegiste «${chosen}».`}
      </p>
    </div>
  );
}

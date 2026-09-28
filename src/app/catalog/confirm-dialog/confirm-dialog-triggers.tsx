'use client';

import { useState } from 'react';

import { buttonClass } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

import { waitForSimulatedWrite } from '../simulated-latency';

type Sample = {
  readonly key: string;
  readonly trigger: string;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly isDestructive: boolean;
};

const SAMPLES: readonly Sample[] = [
  {
    key: 'destructive',
    trigger: 'Destructiva',
    title: '¿Eliminar este producto?',
    description:
      'Guantes de nitrilo, talla M dejará de aparecer en las listas. Sus movimientos se conservan en la bitácora.',
    confirmLabel: 'Eliminar',
    isDestructive: true,
  },
  {
    key: 'regular',
    trigger: 'Normal',
    title: '¿Reactivar esta cuenta?',
    description: 'Ana Morales podrá volver a entrar con su contraseña de siempre.',
    confirmLabel: 'Reactivar',
    isDestructive: false,
  },
];

export function ConfirmDialogTriggers(): React.ReactElement {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const open = SAMPLES.find((sample) => sample.key === openKey);

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {SAMPLES.map((sample) => (
          <button
            key={sample.key}
            type="button"
            onClick={() => setOpenKey(sample.key)}
            className={buttonClass({ variant: 'secondary', size: 'sm' })}
          >
            {sample.trigger}
          </button>
        ))}
      </div>

      {open !== undefined ? (
        <ConfirmDialog
          title={open.title}
          description={open.description}
          confirmLabel={open.confirmLabel}
          cancelLabel="Cancelar"
          isDestructive={open.isDestructive}
          onConfirm={async () => {
            await waitForSimulatedWrite();
            setOpenKey(null);
          }}
          onCancel={() => setOpenKey(null)}
        />
      ) : null}
    </>
  );
}

'use client';

import { useState } from 'react';

import { Toggle } from '@/components/ui/toggle';

import { waitForSimulatedWrite } from '../simulated-latency';

export function ToggleDemo(): React.ReactElement {
  const [isInstant, setIsInstant] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  return (
    <div className="space-y-3 text-sm">
      <p className="flex items-center gap-3">
        <Toggle checked={isInstant} label="Cambio inmediato" onChange={setIsInstant} />
        Cambio inmediato
      </p>
      <p className="flex items-center gap-3">
        <Toggle
          checked={isSaved}
          label="Cuenta activa"
          onChange={async (next) => {
            await waitForSimulatedWrite();
            setIsSaved(next);
          }}
        />
        Cuenta activa (guarda en el servidor)
      </p>
    </div>
  );
}

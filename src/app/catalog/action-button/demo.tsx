'use client';

import { ActionButton } from '@/components/ui/action-button';

import { waitForSimulatedWrite } from '../simulated-latency';

export function ActionButtonDemo(): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ActionButton onAction={waitForSimulatedWrite}>Guardar</ActionButton>
      <ActionButton variant="secondary" onAction={waitForSimulatedWrite}>
        Exportar
      </ActionButton>
      <ActionButton variant="danger" onAction={waitForSimulatedWrite} pendingLabel="Eliminando">
        Eliminar
      </ActionButton>
      <ActionButton disabled onAction={waitForSimulatedWrite}>
        Deshabilitado
      </ActionButton>
      <ActionButton type="submit" isPending>
        Enviando formulario
      </ActionButton>
    </div>
  );
}

'use client';

import { ActionButton } from '@/components/ui/action-button';

import { waitForSimulatedWrite } from '../simulated-latency';

/**
 * El botón no trae altura propia: la pone quien lo usa, como el pie de un
 * formulario. Aquí va la misma que usan los formularios reales.
 */
const FORM_BUTTON_CLASS = 'h-10 px-4';

export function ActionButtonDemo(): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ActionButton onAction={waitForSimulatedWrite} className={FORM_BUTTON_CLASS}>
        Guardar
      </ActionButton>
      <ActionButton
        variant="secondary"
        onAction={waitForSimulatedWrite}
        className={FORM_BUTTON_CLASS}
      >
        Exportar
      </ActionButton>
      <ActionButton
        variant="danger"
        onAction={waitForSimulatedWrite}
        pendingLabel="Eliminando"
        className={FORM_BUTTON_CLASS}
      >
        Eliminar
      </ActionButton>
      <ActionButton disabled onAction={waitForSimulatedWrite} className={FORM_BUTTON_CLASS}>
        Deshabilitado
      </ActionButton>
      <ActionButton type="submit" isPending className={FORM_BUTTON_CLASS}>
        Enviando formulario
      </ActionButton>
    </div>
  );
}

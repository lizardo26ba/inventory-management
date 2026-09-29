'use client';

/**
 * El interruptor de archivar y reactivar de una fila de almacén.
 *
 * Es la única hoja de cliente de la fila. No decide nada: llama a la Server
 * Action, que comprueba el permiso y la regla de existencias, y pinta lo que
 * responda. Si falla, la fila se queda como estaba y el diálogo dice por qué.
 */

import { Toggle } from '@/components/ui/toggle';
import { resultMessageFor, useResultDialog } from '@/components/ui/result-dialog';
import { useCopy } from '@/lib/i18n';

import { setWarehouseActive } from '../actions';

export function WarehouseStatusToggle({
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
    <Toggle
      checked={isActive}
      label={`${copy.warehouses.toggleActive} · ${name}`}
      onChange={async (next) => {
        const result = await setWarehouseActive({ id, isActive: next });
        showResult(
          resultMessageFor(copy, next ? 'warehouseActivate' : 'warehouseArchive', name, result),
        );
      }}
    />
  );
}

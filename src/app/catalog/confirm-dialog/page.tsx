import { CatalogHeader, Specimen, requireEntry } from '../specimen';
import { ConfirmDialogTriggers } from './confirm-dialog-triggers';

export default function ConfirmDialogCatalogPage(): React.ReactElement {
  const entry = requireEntry('confirm-dialog');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Destructiva y normal"
        description="El foco entra en Cancelar, nunca en la acción: quien pulsa Enter por inercia cancela. Al confirmar, el diálogo espera a que termine la escritura (aquí, fingida) y no se deja cerrar mientras tanto."
        usage={`<ConfirmDialog\n  title="…" description="…"\n  confirmLabel="Eliminar" cancelLabel="Cancelar"\n  isDestructive\n  onConfirm={async () => { await deleteProduct(); close(); }}\n  onCancel={close}\n/>`}
      >
        <ConfirmDialogTriggers />
      </Specimen>
    </>
  );
}

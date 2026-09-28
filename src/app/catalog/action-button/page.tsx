import { CatalogHeader, Specimen, requireEntry } from '../specimen';
import { ActionButtonDemo } from './demo';

export default function ActionButtonCatalogPage(): React.ReactElement {
  const entry = requireEntry('action-button');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Mientras la acción viaja"
        description="Pulsa uno: gira y se bloquea hasta que la operación termina, y un doble clic no la lanza dos veces. El último lo gobierna el formulario desde fuera."
        usage={`<ActionButton onAction={async () => { await save(); }} className="h-10 px-4">Guardar</ActionButton>\n<ActionButton type="submit" isPending={isSubmitting} className="h-10 w-full">Entrar</ActionButton>`}
      >
        <ActionButtonDemo />
      </Specimen>
    </>
  );
}

import { CatalogHeader, Specimen, requireEntry } from '../specimen';
import { RowMenuDemo } from './demo';

export default function RowMenuCatalogPage(): React.ReactElement {
  const entry = requireEntry('row-menu');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Acciones de una fila"
        description="Se cierra con Escape, con un clic fuera o al elegir; las flechas recorren las acciones. No sabe qué hace cada una: recibe la lista ya resuelta."
        usage={`<RowMenu\n  label="Acciones de …"\n  actions={[{ label: 'Eliminar', Icon: IconTrash, isDestructive: true, onSelect }]}\n/>`}
      >
        <RowMenuDemo />
      </Specimen>
    </>
  );
}

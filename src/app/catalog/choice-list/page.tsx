import { CatalogHeader, Specimen, requireEntry } from '../specimen';
import { ChoiceListDemo } from './demo';

export default function ChoiceListCatalogPage(): React.ReactElement {
  const entry = requireEntry('choice-list');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Elegir una entre pocas"
        description="Cada opción es un botón entero: lo que la identifica a la izquierda, su nombre y descripción, y un dato a la derecha."
        usage={`<ChoiceList label="Empresas" choices={[{ key, title, description, leading, meta, onSelect }]} />`}
      >
        <ChoiceListDemo />
      </Specimen>
    </>
  );
}

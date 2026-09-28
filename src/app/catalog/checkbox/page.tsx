import { CatalogHeader, Specimen, requireEntry } from '../specimen';
import { CheckboxDemo } from './demo';

export default function CheckboxCatalogPage(): React.ReactElement {
  const entry = requireEntry('checkbox');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Editable y de solo lectura"
        description="Sin función de cambio, la casilla solo informa. Cuando la etiqueta visible está lejos, se anuncia una con label."
        usage={`<Checkbox id="…" checked={value} onChange={setValue} />\n<Checkbox checked isReadOnly label="…" />`}
      >
        <CheckboxDemo />
      </Specimen>
    </>
  );
}

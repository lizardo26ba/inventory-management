import { CatalogHeader, Specimen, requireEntry } from '../specimen';
import { OneTimeCodeDemo } from './demo';

export default function OneTimeCodeFieldCatalogPage(): React.ReactElement {
  const entry = requireEntry('one-time-code-field');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Vacío y con error"
        description="Prueba a pegar un código de seis cifras en cualquier casilla, a borrar en una vacía o a moverte con las flechas. Solo entran cifras."
        usage={`<OneTimeCodeField\n  id="code" value={code} onChange={setCode} length={6}\n  groupLabel="…" positionLabel={(position, total) => …}\n  hasError={false}\n/>`}
      >
        <OneTimeCodeDemo />
      </Specimen>
    </>
  );
}

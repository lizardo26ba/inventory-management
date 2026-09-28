import { CatalogHeader, Specimen, requireEntry } from '../specimen';
import { ToggleDemo } from './demo';

export default function ToggleCatalogPage(): React.ReactElement {
  const entry = requireEntry('toggle');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Inmediato y con espera"
        description="Si el cambio devuelve una promesa, el interruptor gira y se bloquea hasta que termina, y no cambia de posición antes de tiempo."
        usage={`<Toggle checked={isActive} label="Cuenta activa" onChange={async (next) => { await save(next); }} />`}
      >
        <ToggleDemo />
      </Specimen>
    </>
  );
}

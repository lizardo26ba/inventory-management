import { buttonClass } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

import { CatalogHeader, Specimen, SpecimenRow, requireEntry } from '../specimen';

export default function SpinnerCatalogPage(): React.ReactElement {
  const entry = requireEntry('spinner');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Tamaños"
        description="Hereda el color del texto. El tamaño se pasa por clase."
        usage={`<Spinner className="h-6 w-6" />`}
      >
        <SpecimenRow>
          <Spinner />
          <Spinner className="h-6 w-6" />
          <Spinner className="text-primary h-8 w-8" />
        </SpecimenRow>
      </Specimen>

      <Specimen
        title="Dentro del botón que lo disparó"
        description="Quien pulsó mira el botón. El botón se anuncia ocupado con aria-busy; el indicador no dice nada."
        usage={`<button aria-busy disabled>\n  Guardar <Spinner />\n</button>`}
      >
        <SpecimenRow>
          <button type="button" disabled aria-busy className={buttonClass({ size: 'md' })}>
            Guardar
            <Spinner />
          </button>
          <button
            type="button"
            disabled
            aria-busy
            className={buttonClass({ variant: 'danger', size: 'sm' })}
          >
            Eliminar
            <Spinner />
          </button>
        </SpecimenRow>
      </Specimen>
    </>
  );
}

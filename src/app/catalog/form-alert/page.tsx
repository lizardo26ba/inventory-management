import { FormAlert } from '@/components/ui/form-alert';

import { CatalogHeader, Specimen, requireEntry } from '../specimen';

export default function FormAlertCatalogPage(): React.ReactElement {
  const entry = requireEntry('form-alert');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Error al guardar"
        description="Va arriba del formulario y se anuncia en cuanto aparece. Habla de lo que falló al guardar, no de un campo."
        usage={`<FormAlert>…</FormAlert>`}
      >
        <FormAlert>
          Otra persona cambió este producto mientras lo editabas. Recarga la página.
        </FormAlert>
      </Specimen>

      <Specimen
        title="Texto largo"
        description="El icono se queda arriba; el texto se parte a su lado."
      >
        <div className="max-w-sm">
          <FormAlert>
            No se pudo guardar porque se perdió la conexión con el servidor. Los datos siguen en
            el formulario: revisa tu conexión y vuelve a intentarlo.
          </FormAlert>
        </div>
      </Specimen>
    </>
  );
}

import { Field, INPUT_CLASS, Section, inputBorderClass } from '@/components/ui/form';

import { CatalogHeader, Specimen, requireEntry } from '../specimen';
import { SampleSelect, SampleTextarea } from './stateful-controls';

export default function FormCatalogPage(): React.ReactElement {
  const entry = requireEntry('form');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Campo de texto"
        description="Etiqueta, control y una línea de ayuda."
        usage={`<Field id="sku" label="Código" help="…">\n  <input id="sku" className={\`\${INPUT_CLASS} \${inputBorderClass(false)}\`} />\n</Field>`}
      >
        <div className="max-w-sm">
          <Field id="catalog-sku" label="Código" help="Único dentro de la empresa.">
            <input
              id="catalog-sku"
              defaultValue="PRD-0142"
              aria-describedby="catalog-sku-help"
              className={`${INPUT_CLASS} ${inputBorderClass(false)}`}
            />
          </Field>
        </div>
      </Specimen>

      <Specimen
        title="Campo con error"
        description="El error sustituye a la ayuda en lugar de sumarse."
      >
        <div className="max-w-sm">
          <Field
            id="catalog-sku-error"
            label="Código"
            help="Único dentro de la empresa."
            error="Ya hay otro producto con este código."
          >
            <input
              id="catalog-sku-error"
              defaultValue="PRD-0001"
              aria-invalid
              aria-describedby="catalog-sku-error-error"
              className={`${INPUT_CLASS} ${inputBorderClass(true)}`}
            />
          </Field>
        </div>
      </Specimen>

      <Specimen
        title="Desplegable"
        description="La flecha es la del proyecto, igual en todos los navegadores."
        usage={`<Select id="warehouse" value={value} onChange={setValue}>…</Select>`}
      >
        <div className="grid max-w-2xl gap-4 sm:grid-cols-3">
          <Field id="catalog-warehouse" label="Almacén">
            <SampleSelect id="catalog-warehouse" />
          </Field>
          <Field
            id="catalog-warehouse-error"
            label="Con error"
            error="Elige un almacén activo."
          >
            <SampleSelect id="catalog-warehouse-error" hasError />
          </Field>
          <Field id="catalog-warehouse-disabled" label="Deshabilitado">
            <SampleSelect id="catalog-warehouse-disabled" disabled />
          </Field>
        </div>
      </Specimen>

      <Specimen
        title="Desplegable pequeño"
        description="El que va dentro de una fila. Sin etiqueta visible, lleva una anunciada."
        usage={`<Select size="sm" label="Almacén" value={value} onChange={setValue}>…</Select>`}
      >
        <div className="w-48">
          <SampleSelect size="sm" label="Almacén" />
        </div>
      </Specimen>

      <Specimen
        title="Área de texto"
        usage={`<Textarea id="notes" value={value} onChange={setValue} />`}
      >
        <div className="max-w-md">
          <Field id="catalog-notes" label="Notas de entrega">
            <SampleTextarea id="catalog-notes" />
          </Field>
        </div>
      </Specimen>

      <Specimen
        title="Sección"
        description="Agrupa campos con un título, para que un formulario largo no sea una lista suelta."
        usage={`<Section title="…" help="…">…</Section>`}
      >
        <Section
          title="Datos generales"
          help="Lo que identifica al producto en todos los documentos."
        >
          <Field id="catalog-section-name" label="Nombre">
            <input
              id="catalog-section-name"
              defaultValue="Guantes de nitrilo, talla M"
              className={`${INPUT_CLASS} ${inputBorderClass(false)}`}
            />
          </Field>
          <Field id="catalog-section-warehouse" label="Almacén de entrada">
            <SampleSelect id="catalog-section-warehouse" />
          </Field>
        </Section>
      </Specimen>
    </>
  );
}

import { DefinitionList, DefinitionRow } from '@/components/ui/definition-list';
import { Tag, TagRow } from '@/components/ui/tag';

import { CatalogHeader, Specimen, requireEntry } from '../specimen';

export default function DefinitionListCatalogPage(): React.ReactElement {
  const entry = requireEntry('definition-list');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Ficha de solo lectura"
        description="Pares de etiqueta y valor, no filas comparables. En un teléfono la etiqueta se pone encima."
        usage={`<DefinitionList>\n  <DefinitionRow label="Correo">…</DefinitionRow>\n</DefinitionList>`}
      >
        <DefinitionList>
          <DefinitionRow label="Nombre">Ana Morales</DefinitionRow>
          <DefinitionRow label="Correo">ana.morales@example.test</DefinitionRow>
          <DefinitionRow label="Roles">
            <TagRow>
              <Tag>Almacén</Tag>
              <Tag>Compras</Tag>
            </TagRow>
          </DefinitionRow>
          <DefinitionRow label="Notas">
            Cubre el turno de la tarde en la sucursal norte y los sábados en la central. Tiene
            autorización para recibir mercadería de proveedores nuevos.
          </DefinitionRow>
        </DefinitionList>
      </Specimen>
    </>
  );
}

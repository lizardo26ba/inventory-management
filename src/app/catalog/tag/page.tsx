import { Tag, TagRow } from '@/components/ui/tag';

import { CatalogHeader, Specimen, requireEntry } from '../specimen';

const SAMPLE_ROLES = ['Administrador', 'Almacén', 'Compras', 'Ventas', 'Consulta'];

export default function TagCatalogPage(): React.ReactElement {
  const entry = requireEntry('tag');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen title="Sola" usage="<Tag>Administrador</Tag>">
        <Tag>Administrador</Tag>
      </Specimen>

      <Specimen
        title="En fila"
        description="Con varias, se parte la fila, nunca una etiqueta por la mitad."
        usage={`<TagRow>\n  <Tag>Almacén</Tag>\n  <Tag>Compras</Tag>\n</TagRow>`}
      >
        <TagRow>
          {SAMPLE_ROLES.map((role) => (
            <Tag key={role}>{role}</Tag>
          ))}
        </TagRow>
      </Specimen>

      <Specimen title="En poco espacio" description="La misma fila en una columna estrecha.">
        <div className="border-border w-40 border border-dashed p-2">
          <TagRow>
            {SAMPLE_ROLES.map((role) => (
              <Tag key={role}>{role}</Tag>
            ))}
          </TagRow>
        </div>
      </Specimen>
    </>
  );
}

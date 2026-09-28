import { CatalogHeader, Specimen, requireEntry } from '../specimen';
import { SortableTable } from './sortable-table';

export default function TableSortCatalogPage(): React.ReactElement {
  const entry = requireEntry('table-sort');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Cabeceras ordenables"
        description="Son enlaces: el orden vive en ?sort= y ?dir=, se comparte y se deshace con atrás. El primer clic ordena ascendente y el segundo invierte."
        usage={`const { sortKey, direction } = useTableSort('name', 'asc');\n<SortableHeader label="Nombre" columnKey="name" activeKey={sortKey} direction={direction} />`}
      >
        <SortableTable />
      </Specimen>
    </>
  );
}

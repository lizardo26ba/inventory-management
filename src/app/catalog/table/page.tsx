import {
  TABLE_CELL_CLASS,
  Table,
  TableCard,
  TableEmpty,
  TableHeadRow,
  TableHeaderCell,
  TableRow,
  TableToolbar,
} from '@/components/ui/table';
import { Tag } from '@/components/ui/tag';

import { CatalogHeader, Specimen, requireEntry } from '../specimen';

const SAMPLE_PRODUCTS = [
  {
    sku: 'PRD-0142',
    name: 'Guantes de nitrilo, talla M',
    category: 'Protección',
    stock: '1 240',
  },
  { sku: 'PRD-0087', name: 'Cinta de embalaje transparente', category: 'Empaque', stock: '96' },
  { sku: 'PRD-0311', name: 'Etiquetas térmicas 4×6', category: 'Empaque', stock: '0' },
] as const;

/** La columna que sobra en un teléfono. La decide cada lista, no la tabla. */
const SECONDARY_COLUMN_CLASS = 'hidden sm:table-cell';

export default function TableCatalogPage(): React.ReactElement {
  const entry = requireEntry('table');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Lista completa"
        description="Estrecha la ventana: la categoría desaparece antes de que haga falta desplazar."
        usage={`<TableCard>\n  <TableToolbar>…</TableToolbar>\n  <Table>\n    <TableHeadRow>\n      <TableHeaderCell label="Código" />\n    </TableHeadRow>\n    <tbody>\n      <TableRow><td className={TABLE_CELL_CLASS}>…</td></TableRow>\n    </tbody>\n  </Table>\n</TableCard>`}
      >
        <TableCard>
          <TableToolbar>
            <span className="text-text-muted text-sm">{SAMPLE_PRODUCTS.length} productos</span>
          </TableToolbar>
          <Table>
            <TableHeadRow>
              <TableHeaderCell label="Código" />
              <TableHeaderCell label="Nombre" />
              <TableHeaderCell label="Categoría" className={SECONDARY_COLUMN_CLASS} />
              <TableHeaderCell label="Existencia" align="right" />
            </TableHeadRow>
            <tbody>
              {SAMPLE_PRODUCTS.map((product) => (
                <TableRow key={product.sku}>
                  <td className={`${TABLE_CELL_CLASS} font-mono text-xs whitespace-nowrap`}>
                    {product.sku}
                  </td>
                  <td className={TABLE_CELL_CLASS}>{product.name}</td>
                  <td className={`${TABLE_CELL_CLASS} ${SECONDARY_COLUMN_CLASS}`}>
                    <Tag>{product.category}</Tag>
                  </td>
                  <td className={`${TABLE_CELL_CLASS} text-right tabular-nums`}>
                    {product.stock}
                  </td>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </TableCard>
      </Specimen>

      <Specimen
        title="Sin resultados"
        description="Sustituye a la tabla entera: una tabla con cabeceras y sin filas parece que carga."
        usage={`<TableEmpty message="…" />`}
      >
        <TableCard>
          <TableToolbar>
            <span className="text-text-muted text-sm">0 productos</span>
          </TableToolbar>
          <TableEmpty message="Ningún producto coincide con la búsqueda." />
        </TableCard>
      </Specimen>
    </>
  );
}

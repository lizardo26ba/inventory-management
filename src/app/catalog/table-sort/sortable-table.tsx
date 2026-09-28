'use client';

import {
  TABLE_CELL_CLASS,
  Table,
  TableCard,
  TableHeadRow,
  TableRow,
} from '@/components/ui/table';
import { SortableHeader, sortRows, useTableSort } from '@/components/ui/table-sort';

const SAMPLE_PRODUCTS = [
  { sku: 'PRD-0142', name: 'Guantes de nitrilo, talla M', stock: 1240 },
  { sku: 'PRD-0087', name: 'Cinta de embalaje transparente', stock: 96 },
  { sku: 'PRD-0311', name: 'Etiquetas térmicas 4×6', stock: 0 },
  { sku: 'PRD-0205', name: 'Alcohol en gel, 500 ml', stock: 418 },
] as const;

type Product = (typeof SAMPLE_PRODUCTS)[number];

const ACCESSORS: Readonly<Record<string, (product: Product) => string | number>> = {
  sku: (product) => product.sku,
  name: (product) => product.name,
  stock: (product) => product.stock,
};

/**
 * En la aplicación ordena el servidor; aquí, `sortRows` sobre la lista
 * inventada. Lo que se enseña es la cabecera, que es igual en los dos casos.
 */
export function SortableTable(): React.ReactElement {
  const { sortKey, direction } = useTableSort('name', 'asc');
  const rows = sortRows(SAMPLE_PRODUCTS, ACCESSORS[sortKey], direction);

  return (
    <TableCard>
      <Table>
        <TableHeadRow>
          <SortableHeader
            label="Código"
            columnKey="sku"
            activeKey={sortKey}
            direction={direction}
          />
          <SortableHeader
            label="Nombre"
            columnKey="name"
            activeKey={sortKey}
            direction={direction}
          />
          <SortableHeader
            label="Existencia"
            columnKey="stock"
            activeKey={sortKey}
            direction={direction}
            align="right"
          />
        </TableHeadRow>
        <tbody>
          {rows.map((product) => (
            <TableRow key={product.sku}>
              <td className={`${TABLE_CELL_CLASS} font-mono text-xs`}>{product.sku}</td>
              <td className={TABLE_CELL_CLASS}>{product.name}</td>
              <td className={`${TABLE_CELL_CLASS} text-right tabular-nums`}>{product.stock}</td>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </TableCard>
  );
}

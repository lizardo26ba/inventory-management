'use client';

import { useState } from 'react';

import { buttonClass } from '@/components/ui/button';
import {
  TABLE_CELL_CLASS,
  Table,
  TableCard,
  TableHeadRow,
  TableHeaderCell,
  TableRow,
  TableToolbar,
} from '@/components/ui/table';
import {
  TableBody,
  TableLoadingProvider,
  TableProgress,
  useLoadingSource,
} from '@/components/ui/table-loading';

const SAMPLE_WAREHOUSES = [
  { code: 'ALM-01', name: 'Central' },
  { code: 'ALM-02', name: 'Sucursal Norte' },
  { code: 'ALM-03', name: 'Sucursal Sur' },
] as const;

/** Lo que fingiría una consulta, a mano: se enciende y se apaga con el botón. */
function ReloadSwitch(): React.ReactElement {
  const [isBusy, setIsBusy] = useState(false);
  useLoadingSource('catalog-demo', isBusy);

  return (
    <button
      type="button"
      onClick={() => setIsBusy((current) => !current)}
      aria-pressed={isBusy}
      className={buttonClass({ variant: 'secondary', size: 'sm', className: 'ml-auto' })}
    >
      {isBusy ? 'Terminar la recarga' : 'Simular una recarga'}
    </button>
  );
}

export function ReloadingTable(): React.ReactElement {
  return (
    <TableLoadingProvider>
      <TableCard>
        <TableToolbar>
          <span className="text-text-muted text-sm">{SAMPLE_WAREHOUSES.length} almacenes</span>
          <ReloadSwitch />
          <TableProgress />
        </TableToolbar>
        <TableBody>
          <Table>
            <TableHeadRow>
              <TableHeaderCell label="Código" />
              <TableHeaderCell label="Nombre" />
            </TableHeadRow>
            <tbody>
              {SAMPLE_WAREHOUSES.map((warehouse) => (
                <TableRow key={warehouse.code}>
                  <td className={`${TABLE_CELL_CLASS} font-mono text-xs`}>{warehouse.code}</td>
                  <td className={TABLE_CELL_CLASS}>{warehouse.name}</td>
                </TableRow>
              ))}
            </tbody>
          </Table>
        </TableBody>
      </TableCard>
    </TableLoadingProvider>
  );
}

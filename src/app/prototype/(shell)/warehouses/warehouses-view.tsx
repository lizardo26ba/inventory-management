'use client';

/**
 * Lista de almacenes de la empresa activa.
 *
 * Es la primera pantalla de la operación que alguien que no es super
 * administrador ve con datos. Tiene lo mismo que la lista de empresas, búsqueda
 * y orden en la dirección, pero no lleva cifras arriba ni paginación: una
 * empresa tiene unos pocos almacenes, y una pila de controles para recorrer
 * cinco filas es ruido. Si alguna empresa llegara a tener decenas, la tabla ya
 * admite el pie de paginación sin cambiar de forma.
 *
 * Lo que se puede hacer depende del rol en esta empresa, y la pantalla lo
 * refleja en lugar de ofrecer lo que luego se va a negar:
 *
 * - Sin `warehouse.read`, la pantalla entera es el aviso de acceso denegado.
 * - Sin `warehouse.create`, no aparece el botón de alta.
 * - Sin `warehouse.update`, el nombre no lleva a la edición.
 * - Sin `warehouse.archive`, el estado se lee pero no se cambia.
 *
 * Nada de eso es autorización: en la aplicación real el servidor vuelve a
 * comprobar cada permiso. Principio 1 de CLAUDE.md.
 *
 * Archivar no borra. Un almacén con movimientos es parte de la historia de la
 * empresa, y el libro de movimientos no se reescribe. RN-093, ADR 0002.
 */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { useCopy } from '@/lib/i18n';
import { formatQuantity } from '@/lib/format';
import { useCompanyPermissions } from '../../company-permissions';
import { findCountry, findTimeZone, type Warehouse } from '../../fake-data';
import { reportResult } from '../../report-result';
import { useSimulatedQuery } from '../../simulated-query';
import { buttonClass } from '../../ui/button';
import { EmptyState } from '../../ui/empty-state';
import { CountryFlag } from '../../ui/flag';
import { IconPlus } from '../../ui/icons';
import { Monogram } from '../../ui/monogram';
import { PageHeader } from '../../ui/page-header';
import { useResultDialog } from '../../ui/result-dialog';
import { SearchInput } from '../../ui/search-input';
import {
  TABLE_CELL_CLASS,
  Table,
  TableCard,
  TableEmpty,
  TableHeadRow,
  TableRow,
  TableToolbar,
} from '../../ui/table';
import { TableBody, TableProgress } from '../../ui/table-loading';
import { SortableHeader, sortRows, useTableSort } from '../../ui/table-sort';
import { Toggle } from '../../ui/toggle';
import { WarehouseHasStockError, useWarehouseStore } from '../../warehouse-store';
import { WarehouseNoAccess } from './no-access';
import { NEW_WAREHOUSE_PATH, editWarehousePath } from './paths';

/** Clave corta y estable en la dirección, independiente del rótulo de la columna. */
const SORT_ACCESSORS: Record<string, (warehouse: Warehouse) => string | boolean> = {
  name: (warehouse) => warehouse.name,
  code: (warehouse) => warehouse.code,
  country: (warehouse) => findCountry(warehouse.countryCode)?.name ?? warehouse.countryCode,
  timeZone: (warehouse) => timeZoneLabel(warehouse),
  status: (warehouse) => warehouse.active,
};

function timeZoneLabel(warehouse: Warehouse): string {
  return findTimeZone(warehouse.countryCode, warehouse.timeZone)?.label ?? warehouse.timeZone;
}

function matchesQuery(warehouse: Warehouse, query: string): boolean {
  if (query === '') return true;
  return `${warehouse.name} ${warehouse.code}`.toLowerCase().includes(query);
}

export function WarehousesView(): React.ReactElement {
  const copy = useCopy();
  const permissions = useCompanyPermissions();
  const searchParams = useSearchParams();
  const { warehouses, setWarehouseActive } = useWarehouseStore();
  const showResult = useResultDialog();

  const query = (searchParams.get('q') ?? '').trim().toLowerCase();
  // Por nombre: aquí no hay "lo último que se dio de alta" que buscar, se busca
  // un almacén conocido.
  const sort = useTableSort('name', 'asc');
  const visible = sortRows(
    warehouses.filter((warehouse) => matchesQuery(warehouse, query)),
    SORT_ACCESSORS[sort.sortKey],
    sort.direction,
  );

  useSimulatedQuery(searchParams.toString());

  if (!permissions.has('warehouse.read')) return <WarehouseNoAccess />;

  const canCreate = permissions.has('warehouse.create');
  const canUpdate = permissions.has('warehouse.update');
  const canArchive = permissions.has('warehouse.archive');

  const createLink = canCreate ? (
    <Link href={NEW_WAREHOUSE_PATH as never} className={buttonClass({ size: 'sm' })}>
      <IconPlus className="h-4 w-4" />
      {copy.warehouses.create}
    </Link>
  ) : null;

  return (
    <div className="space-y-5">
      <PageHeader title={copy.warehouses.title} subtitle={copy.warehouses.subtitle}>
        {createLink}
      </PageHeader>

      {warehouses.length === 0 ? (
        // Sin ningún almacén la empresa no puede registrar nada, así que el
        // vacío no es una tabla sin filas: es la explicación de por dónde
        // empezar, con la acción a mano si se tiene permiso para ella.
        <EmptyState
          title={copy.warehouses.noneTitle}
          message={canCreate ? copy.warehouses.none : copy.warehouses.noneReadOnly}
        >
          {createLink ?? undefined}
        </EmptyState>
      ) : (
        <TableCard>
          <TableToolbar>
            <SearchInput placeholder={copy.warehouses.searchPlaceholder} />
            <p className="text-text-muted ml-auto text-sm">
              {formatQuantity(visible.length)} {copy.warehouses.resultCount}
            </p>

            <TableProgress />
          </TableToolbar>

          <TableBody>
            {visible.length === 0 ? (
              <TableEmpty message={copy.warehouses.empty} />
            ) : (
              <Table>
                <TableHeadRow>
                  <SortableHeader
                    label={copy.warehouses.columnName}
                    columnKey="name"
                    activeKey={sort.sortKey}
                    direction={sort.direction}
                  />
                  <SortableHeader
                    label={copy.warehouses.columnCode}
                    columnKey="code"
                    activeKey={sort.sortKey}
                    direction={sort.direction}
                    className="hidden sm:table-cell"
                  />
                  <SortableHeader
                    label={copy.warehouses.columnCountry}
                    columnKey="country"
                    activeKey={sort.sortKey}
                    direction={sort.direction}
                    className="hidden md:table-cell"
                  />
                  <SortableHeader
                    label={copy.warehouses.columnTimeZone}
                    columnKey="timeZone"
                    activeKey={sort.sortKey}
                    direction={sort.direction}
                    className="hidden lg:table-cell"
                  />
                  <SortableHeader
                    label={copy.warehouses.columnStatus}
                    columnKey="status"
                    activeKey={sort.sortKey}
                    direction={sort.direction}
                  />
                </TableHeadRow>
                <tbody>
                  {visible.map((warehouse) => (
                    <TableRow key={warehouse.id}>
                      <td className={`${TABLE_CELL_CLASS} w-full max-w-0`}>
                        <div className="flex items-center gap-3">
                          <Monogram text={warehouse.code} />
                          <span className="min-w-0">
                            {canUpdate ? (
                              <Link
                                href={editWarehousePath(warehouse.id) as never}
                                className="block truncate font-medium hover:underline"
                              >
                                {warehouse.name}
                              </Link>
                            ) : (
                              <span className="block truncate font-medium">
                                {warehouse.name}
                              </span>
                            )}
                            {/* En pantalla estrecha el país y el código se
                                esconden como columna, así que se repiten aquí:
                                sin ellos dos almacenes de igual nombre en
                                países distintos no se distinguen. Cada
                                separador se esconde junto con lo que lo
                                precede, para que nunca quede uno suelto. */}
                            <span className="text-text-muted block truncate text-xs">
                              <span className="font-mono sm:hidden">{warehouse.code}</span>
                              <span className="md:hidden">
                                <span className="sm:hidden"> · </span>
                                {findCountry(warehouse.countryCode)?.name ??
                                  warehouse.countryCode}
                              </span>
                              {warehouse.address !== undefined ? (
                                <>
                                  <span className="md:hidden"> · </span>
                                  {warehouse.address}
                                </>
                              ) : null}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td
                        className={`${TABLE_CELL_CLASS} text-text-muted hidden font-mono text-xs whitespace-nowrap sm:table-cell`}
                      >
                        {warehouse.code}
                      </td>
                      <td
                        className={`${TABLE_CELL_CLASS} text-text-muted hidden whitespace-nowrap md:table-cell`}
                      >
                        <span className="flex items-center gap-2">
                          <CountryFlag
                            countryCode={warehouse.countryCode}
                            className="h-4 w-4"
                          />
                          {findCountry(warehouse.countryCode)?.name ?? warehouse.countryCode}
                        </span>
                      </td>
                      <td
                        className={`${TABLE_CELL_CLASS} text-text-muted hidden whitespace-nowrap lg:table-cell`}
                      >
                        {timeZoneLabel(warehouse)}
                      </td>
                      <td className={`${TABLE_CELL_CLASS} whitespace-nowrap`}>
                        <span className="flex items-center gap-2">
                          {canArchive ? (
                            <Toggle
                              checked={warehouse.active}
                              label={`${copy.warehouses.toggleActive} · ${warehouse.name}`}
                              onChange={(next) =>
                                reportResult(
                                  showResult,
                                  copy,
                                  next ? 'warehouseActivate' : 'warehouseArchive',
                                  warehouse.name,
                                  () => setWarehouseActive(warehouse.id, next),
                                  (error) =>
                                    error instanceof WarehouseHasStockError
                                      ? copy.result.warehouseHasStock
                                      : undefined,
                                )
                              }
                            />
                          ) : null}
                          <span
                            className={`text-xs ${
                              warehouse.active ? 'text-success' : 'text-text-muted'
                            }`}
                          >
                            {warehouse.active ? copy.status.active : copy.warehouses.archived}
                          </span>
                        </span>
                      </td>
                    </TableRow>
                  ))}
                </tbody>
              </Table>
            )}
          </TableBody>
        </TableCard>
      )}
    </div>
  );
}

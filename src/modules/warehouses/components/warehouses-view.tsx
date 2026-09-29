/**
 * Lista de almacenes de la empresa activa.
 *
 * Es un componente de servidor. Recibe la lista ya consultada y la pinta: no
 * filtra ni ordena, porque eso ya ocurrió en la base. Lo único de cliente son las
 * hojas que reaccionan: el buscador, las cabeceras ordenables y el interruptor.
 *
 * No lleva cifras arriba ni paginación: una empresa tiene unos pocos almacenes,
 * y una pila de controles para recorrer cinco filas es ruido.
 *
 * Lo que se ofrece depende de los permisos, que llegan ya resueltos del
 * servidor. Esconder no es autorizar: cada acción vuelve a comprobar el suyo.
 * Principio 1 de CLAUDE.md.
 */

import Link from 'next/link';

import { buttonClass } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { CountryFlag } from '@/components/ui/flag';
import { IconPlus } from '@/components/ui/icons';
import { Monogram } from '@/components/ui/monogram';
import { PageHeader } from '@/components/ui/page-header';
import { SearchInput } from '@/components/ui/search-input';
import { SortableHeader } from '@/components/ui/table-sort';
import { TableBody, TableProgress } from '@/components/ui/table-loading';
import {
  TABLE_CELL_CLASS,
  Table,
  TableCard,
  TableEmpty,
  TableHeadRow,
  TableRow,
  TableToolbar,
} from '@/components/ui/table';
import { formatQuantity } from '@/lib/format';
import { getCopy } from '@/lib/i18n/server';

import { NEW_WAREHOUSE_PATH, editWarehousePath } from '../routes';
import type { WarehouseListQuery } from '../schema';
import { timeZoneCity } from '../service';
import type { WarehouseListItem } from '../types';
import { WarehouseStatusToggle } from './warehouse-status-toggle';

export type WarehouseViewPermissions = {
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canArchive: boolean;
};

export async function WarehousesView({
  items,
  total,
  query,
  permissions,
}: {
  readonly items: readonly WarehouseListItem[];
  /** Cuántos tiene la empresa, sin contar la búsqueda. */
  readonly total: number;
  readonly query: WarehouseListQuery;
  readonly permissions: WarehouseViewPermissions;
}): Promise<React.ReactElement> {
  const copy = await getCopy();

  const createLink = permissions.canCreate ? (
    <Link href={NEW_WAREHOUSE_PATH} className={buttonClass({ size: 'sm' })}>
      <IconPlus className="h-4 w-4" />
      {copy.warehouses.create}
    </Link>
  ) : null;

  return (
    <div className="space-y-5">
      <PageHeader title={copy.warehouses.title} subtitle={copy.warehouses.subtitle}>
        {createLink}
      </PageHeader>

      {total === 0 ? (
        // Sin ningún almacén la empresa no puede registrar nada, así que el
        // vacío no es una tabla sin filas: es la explicación de por dónde
        // empezar, con la acción a mano si se tiene permiso para ella.
        <EmptyState
          title={copy.warehouses.noneTitle}
          message={permissions.canCreate ? copy.warehouses.none : copy.warehouses.noneReadOnly}
        >
          {createLink ?? undefined}
        </EmptyState>
      ) : (
        <TableCard>
          <TableToolbar>
            <SearchInput placeholder={copy.warehouses.searchPlaceholder} />
            <p className="text-text-muted ml-auto text-sm">
              {formatQuantity(items.length)} {copy.warehouses.resultCount}
            </p>

            <TableProgress />
          </TableToolbar>

          <TableBody>
            {items.length === 0 ? (
              <TableEmpty message={copy.warehouses.empty} />
            ) : (
              <Table>
                <TableHeadRow>
                  <SortableHeader
                    label={copy.warehouses.columnName}
                    columnKey="name"
                    activeKey={query.sort}
                    direction={query.direction}
                  />
                  <SortableHeader
                    label={copy.warehouses.columnCode}
                    columnKey="code"
                    activeKey={query.sort}
                    direction={query.direction}
                    className="hidden sm:table-cell"
                  />
                  <SortableHeader
                    label={copy.warehouses.columnCountry}
                    columnKey="country"
                    activeKey={query.sort}
                    direction={query.direction}
                    className="hidden md:table-cell"
                  />
                  <SortableHeader
                    label={copy.warehouses.columnTimeZone}
                    columnKey="timeZone"
                    activeKey={query.sort}
                    direction={query.direction}
                    className="hidden lg:table-cell"
                  />
                  <SortableHeader
                    label={copy.warehouses.columnStatus}
                    columnKey="status"
                    activeKey={query.sort}
                    direction={query.direction}
                  />
                </TableHeadRow>
                <tbody>
                  {items.map((warehouse) => (
                    <TableRow key={warehouse.id}>
                      <td className={`${TABLE_CELL_CLASS} w-full max-w-0`}>
                        <div className="flex items-center gap-3">
                          <Monogram text={warehouse.code} />
                          <span className="min-w-0">
                            {permissions.canUpdate ? (
                              <Link
                                href={editWarehousePath(warehouse.code)}
                                className="block truncate font-medium hover:underline"
                              >
                                {warehouse.name}
                              </Link>
                            ) : (
                              <span className="block truncate font-medium">
                                {warehouse.name}
                              </span>
                            )}
                            {/* En pantalla estrecha el código y el país se
                                esconden como columna y se repiten aquí. Cada
                                separador se esconde con lo que lo precede, para
                                que nunca quede uno suelto. */}
                            <span className="text-text-muted block truncate text-xs">
                              <span className="font-mono sm:hidden">{warehouse.code}</span>
                              <span className="md:hidden">
                                <span className="sm:hidden"> · </span>
                                {warehouse.countryName}
                              </span>
                              {warehouse.address !== null ? (
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
                          {warehouse.countryName}
                        </span>
                      </td>
                      <td
                        className={`${TABLE_CELL_CLASS} text-text-muted hidden whitespace-nowrap lg:table-cell`}
                      >
                        {timeZoneCity(warehouse.timeZone)}
                      </td>
                      {/* La palabra al lado dice el estado, porque el color no basta. */}
                      <td className={`${TABLE_CELL_CLASS} whitespace-nowrap`}>
                        <span className="flex items-center gap-2">
                          {permissions.canArchive ? (
                            <WarehouseStatusToggle
                              id={warehouse.id}
                              name={warehouse.name}
                              isActive={warehouse.isActive}
                            />
                          ) : null}
                          <span
                            className={`text-xs ${
                              warehouse.isActive ? 'text-success' : 'text-text-muted'
                            }`}
                          >
                            {warehouse.isActive ? copy.status.active : copy.warehouses.archived}
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

/**
 * Lista de empresas.
 *
 * Es un componente de servidor. Recibe la página ya consultada y la pinta: no
 * filtra, no ordena y no recorta, porque eso ya ocurrió en la base. Lo único de
 * cliente que hay dentro son las hojas que necesitan reaccionar, el buscador y
 * las cabeceras ordenables, y esas vienen de las primitivas compartidas.
 *
 * Las cifras de arriba son de la plataforma entera y no las afecta la búsqueda.
 * Es la única pantalla donde se miran datos por encima de una empresa.
 */

import Link from 'next/link';

import { buttonClass } from '@/components/ui/button';
import { IconPlus } from '@/components/ui/icons';
import { Monogram } from '@/components/ui/monogram';
import { PageHeader } from '@/components/ui/page-header';
import { SearchInput } from '@/components/ui/search-input';
import { SummaryCard, SummaryCardGrid } from '@/components/ui/summary-card';
import { CountryFlag } from '@/components/ui/flag';
import { TablePagination } from '@/components/ui/pagination';
import { SortableHeader } from '@/components/ui/table-sort';
import { TableBody, TableProgress } from '@/components/ui/table-loading';
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
import { formatDate, formatQuantity } from '@/lib/format';
import { getCopy } from '@/lib/i18n/server';

import { ORGANIZATIONS_PATH, organizationPath } from '../routes';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, type OrganizationListQuery } from '../schema';
import { type OrganizationListItem, type OrganizationsSummary } from '../types';
import { OrganizationRowMenu, OrganizationStatusToggle } from './organization-row-actions';

export async function OrganizationsView({
  items,
  total,
  summary,
  query,
}: {
  readonly items: readonly OrganizationListItem[];
  readonly total: number;
  readonly summary: OrganizationsSummary;
  readonly query: OrganizationListQuery;
}): Promise<React.ReactElement> {
  const copy = await getCopy();

  const pageCount = Math.max(1, Math.ceil(total / query.pageSize));
  const firstIndex = (query.page - 1) * query.pageSize;

  return (
    <div className="space-y-5">
      <PageHeader title={copy.organizations.title} subtitle={copy.organizations.subtitle}>
        <Link href={`${ORGANIZATIONS_PATH}/new`} className={buttonClass({ size: 'sm' })}>
          <IconPlus className="h-4 w-4" />
          {copy.organizations.create}
        </Link>
      </PageHeader>

      <SummaryCardGrid>
        <SummaryCard
          label={copy.organizations.totalCompanies}
          value={formatQuantity(summary.organizationCount)}
        />
        <SummaryCard
          label={copy.organizations.totalUsers}
          value={formatQuantity(summary.userCount)}
        />
        <SummaryCard
          label={copy.organizations.totalWarehouses}
          value={formatQuantity(summary.warehouseCount)}
        />
        <SummaryCard
          label={copy.organizations.countryCount}
          value={formatQuantity(summary.countryCount)}
        />
      </SummaryCardGrid>

      <TableCard>
        <TableToolbar>
          <SearchInput placeholder={copy.organizations.searchPlaceholder} />
          <p className="text-text-muted ml-auto text-sm">
            {formatQuantity(total)} {copy.organizations.resultCount}
          </p>

          <TableProgress />
        </TableToolbar>

        <TableBody>
          {items.length === 0 ? (
            <TableEmpty
              message={query.search === '' ? copy.organizations.none : copy.organizations.empty}
            />
          ) : (
            <Table>
              <TableHeadRow>
                <SortableHeader
                  label={copy.organizations.columnName}
                  columnKey="name"
                  activeKey={query.sort}
                  direction={query.direction}
                />
                <SortableHeader
                  label={copy.organizations.columnCode}
                  columnKey="slug"
                  activeKey={query.sort}
                  direction={query.direction}
                />
                <SortableHeader
                  label={copy.organizations.columnCountry}
                  columnKey="country"
                  activeKey={query.sort}
                  direction={query.direction}
                />
                <SortableHeader
                  label={copy.organizations.columnCurrency}
                  columnKey="currency"
                  activeKey={query.sort}
                  direction={query.direction}
                  className="hidden lg:table-cell"
                />
                <SortableHeader
                  label={copy.organizations.columnUsers}
                  columnKey="users"
                  activeKey={query.sort}
                  direction={query.direction}
                  align="right"
                />
                {/* Sin ordenar: el esquema no relaciona almacenes con
                    empresas, así que la base no puede ordenar por ese
                    recuento. Ver el comentario en schema.ts. */}
                <TableHeaderCell
                  label={copy.organizations.columnWarehouses}
                  align="right"
                  className="hidden xl:table-cell"
                />
                <SortableHeader
                  label={copy.organizations.columnCreatedAt}
                  columnKey="created"
                  activeKey={query.sort}
                  direction={query.direction}
                  className="hidden lg:table-cell"
                />
                <SortableHeader
                  label={copy.organizations.columnStatus}
                  columnKey="status"
                  activeKey={query.sort}
                  direction={query.direction}
                />
                <TableHeaderCell
                  label={copy.organizations.columnActions}
                  align="right"
                  isLabelHidden
                />
              </TableHeadRow>
              <tbody>
                {items.map((organization) => (
                  <TableRow key={organization.id}>
                    {/* Esta columna absorbe el ancho sobrante y es la que cede
                        cuando falta sitio. Por eso el nombre se recorta aquí y
                        no en las columnas de datos, que son cortas y fijas. */}
                    <td className={`${TABLE_CELL_CLASS} w-full max-w-0`}>
                      <div className="flex items-center gap-3">
                        <Monogram text={organization.slug} />
                        <span className="min-w-0">
                          <Link
                            href={organizationPath(organization.slug)}
                            className="block truncate font-medium hover:underline"
                          >
                            {organization.name}
                          </Link>
                          <span className="text-text-muted block truncate text-xs">
                            {organization.legalName}
                          </span>
                        </span>
                      </div>
                    </td>

                    <td
                      className={`${TABLE_CELL_CLASS} font-mono text-xs whitespace-nowrap uppercase`}
                    >
                      {organization.slug}
                    </td>

                    <td className={`${TABLE_CELL_CLASS} text-text-muted whitespace-nowrap`}>
                      <span className="flex items-center gap-2">
                        <CountryFlag
                          countryCode={organization.countryCode}
                          className="h-4 w-4"
                        />
                        {organization.countryName}
                      </span>
                    </td>

                    <td
                      className={`${TABLE_CELL_CLASS} text-text-muted hidden whitespace-nowrap lg:table-cell`}
                    >
                      {organization.baseCurrencyCode}
                    </td>

                    <td className={`${TABLE_CELL_CLASS} text-right tabular-nums`}>
                      {formatQuantity(organization.userCount)}
                    </td>

                    <td
                      className={`${TABLE_CELL_CLASS} hidden text-right tabular-nums xl:table-cell`}
                    >
                      {formatQuantity(organization.warehouseCount)}
                    </td>

                    <td
                      className={`${TABLE_CELL_CLASS} text-text-muted hidden whitespace-nowrap tabular-nums lg:table-cell`}
                    >
                      {formatDate(organization.createdAt.toISOString())}
                    </td>

                    {/* El interruptor surte efecto en el acto. La palabra al
                        lado dice el estado, porque el color no basta. */}
                    <td className={`${TABLE_CELL_CLASS} whitespace-nowrap`}>
                      <OrganizationStatusToggle
                        id={organization.id}
                        name={organization.name}
                        isActive={organization.isActive}
                      />
                    </td>

                    <td className={`${TABLE_CELL_CLASS} text-right`}>
                      <OrganizationRowMenu
                        id={organization.id}
                        slug={organization.slug}
                        name={organization.name}
                      />
                    </td>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </TableBody>

        <TablePagination
          page={query.page}
          pageCount={pageCount}
          pageSize={query.pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          firstIndex={firstIndex}
          visibleCount={items.length}
          totalCount={total}
          controlId="organization-rows-per-page"
          defaultPageSize={DEFAULT_PAGE_SIZE}
        />
      </TableCard>
    </div>
  );
}

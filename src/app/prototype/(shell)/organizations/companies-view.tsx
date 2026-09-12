'use client';

/**
 * Lista de empresas.
 *
 * Es el destino del acceso administrativo y el punto de partida de todo lo
 * demás: sin una empresa creada no hay productos, ni almacenes, ni usuarios que
 * puedan entrar a nada.
 *
 * El texto buscado, la página y el tamaño de página viven en la dirección. Esa
 * es la jerarquía de estado que manda CLAUDE.md: lo que debe sobrevivir a una
 * recarga y poder compartirse por enlace no se guarda dentro del componente.
 *
 * En el prototipo filtra y recorta en el navegador sobre un arreglo en memoria.
 * En la aplicación real eso será una cláusula de filtro y un límite en la
 * consulta, y la pantalla no cambiará de forma.
 *
 * Las cifras de arriba son de la plataforma entera y no las afecta la búsqueda.
 * Es la única pantalla donde se miran datos por encima de una empresa.
 */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { useCompanyStore } from '../../company-store';
import { useCopy } from '@/lib/i18n';
import { type Company } from '../../fake-data';
import { CountryFlag } from '../../ui/flag';
import { formatDate, formatQuantity } from '@/lib/format';
import { IconPlus } from '../../ui/icons';
import { Monogram } from '../../ui/monogram';
import { PageHeader } from '../../ui/page-header';
import { SummaryCard, SummaryCardGrid } from '../../ui/summary-card';
import {
  TABLE_CELL_CLASS,
  Table,
  TableCard,
  TableEmpty,
  TableHeadRow,
  TableHeaderCell,
  TableRow,
  TableToolbar,
} from '../../ui/table';
import { TableBody, TableProgress } from '../../ui/table-loading';
import { useSimulatedQuery } from '../../simulated-query';
import { SortableHeader, sortRows, useTableSort } from '../../ui/table-sort';
import { Toggle } from '../../ui/toggle';
import { CompanyRowMenu } from './row-menu';
import { buttonClass } from '../../ui/button';
import { TablePagination } from '../../ui/pagination';
import { SearchInput } from '../../ui/search-input';

const PAGE_SIZE_OPTIONS = [20, 40, 100] as const;
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

/**
 * Cómo se ordena por cada columna. La clave es la que viaja en la dirección, y
 * por eso es corta y estable: sobrevive a que la columna cambie de nombre.
 */
const SORT_ACCESSORS: Record<string, (company: Company) => string | number | boolean> = {
  name: (company) => company.name,
  code: (company) => company.code,
  country: (company) => company.countryName,
  currency: (company) => company.currency,
  users: (company) => company.userCount,
  warehouses: (company) => company.warehouseCount,
  created: (company) => company.createdAt,
  createdBy: (company) => company.createdByEmail,
  status: (company) => company.active,
};

function matchesQuery(company: Company, query: string): boolean {
  if (query === '') return true;
  const haystack =
    `${company.name} ${company.legalName} ${company.code} ${company.countryName}`.toLowerCase();
  return haystack.includes(query);
}

export function CompaniesView(): React.ReactElement {
  const copy = useCopy();

  const searchParams = useSearchParams();
  const { companies, setCompanyActive } = useCompanyStore();

  const query = (searchParams.get('q') ?? '').trim().toLowerCase();

  const requestedSize = Number(searchParams.get('size'));
  const pageSize = PAGE_SIZE_OPTIONS.includes(
    requestedSize as (typeof PAGE_SIZE_OPTIONS)[number],
  )
    ? requestedSize
    : DEFAULT_PAGE_SIZE;

  // Por lo más reciente. Lo último que se dio de alta es lo que se viene a
  // mirar; el orden alfabético entierra una empresa nueva en medio de la lista.
  const sort = useTableSort('created', 'desc');
  const filtered = sortRows(
    companies.filter((company) => matchesQuery(company, query)),
    SORT_ACCESSORS[sort.sortKey],
    sort.direction,
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));

  // Una página fuera de rango, escrita a mano o heredada de una búsqueda
  // anterior, se corrige en lugar de mostrar una tabla vacía.
  const requestedPage = Number(searchParams.get('page') ?? '1');
  const page = Number.isFinite(requestedPage)
    ? Math.min(Math.max(Math.trunc(requestedPage), 1), pageCount)
    : 1;

  const firstIndex = (page - 1) * pageSize;
  const visible = filtered.slice(firstIndex, firstIndex + pageSize);

  // Toda consulta nueva (buscar, ordenar, filtrar o cambiar de página) enciende
  // la barra de la cabecera. La firma es el conjunto de parámetros de la
  // dirección, que es exactamente lo que viajará a la consulta real.
  useSimulatedQuery(searchParams.toString());

  const totalUsers = companies.reduce((sum, company) => sum + company.userCount, 0);
  const totalWarehouses = companies.reduce((sum, company) => sum + company.warehouseCount, 0);
  const countryCount = new Set(companies.map((company) => company.countryCode)).size;

  return (
    <div className="space-y-5">
      <PageHeader title={copy.organizations.title} subtitle={copy.organizations.subtitle}>
        <Link
          href={'/prototype/organizations/new' as never}
          className={buttonClass({ size: 'sm' })}
        >
          <IconPlus className="h-4 w-4" />
          {copy.organizations.create}
        </Link>
      </PageHeader>

      <SummaryCardGrid>
        <SummaryCard
          label={copy.organizations.totalCompanies}
          value={formatQuantity(companies.length)}
        />
        <SummaryCard label={copy.organizations.totalUsers} value={formatQuantity(totalUsers)} />
        <SummaryCard
          label={copy.organizations.totalWarehouses}
          value={formatQuantity(totalWarehouses)}
        />
        <SummaryCard
          label={copy.organizations.countryCount}
          value={formatQuantity(countryCount)}
        />
      </SummaryCardGrid>

      <TableCard>
        <TableToolbar>
          <SearchInput placeholder={copy.organizations.searchPlaceholder} />
          <p className="text-text-muted ml-auto text-sm">
            {formatQuantity(filtered.length)} {copy.organizations.resultCount}
          </p>

          <TableProgress />
        </TableToolbar>

        <TableBody>
          {visible.length === 0 ? (
            <TableEmpty message={copy.organizations.empty} />
          ) : (
            /* Diez columnas no caben en una pantalla estrecha sin apretarlas
               hasta hacerlas ilegibles. En lugar de desplazar en horizontal, las
               menos importantes desaparecen y vuelven al ensancharse. */
            <Table>
              <TableHeadRow>
                <SortableHeader
                  label={copy.organizations.columnName}
                  columnKey="name"
                  activeKey={sort.sortKey}
                  direction={sort.direction}
                />
                <SortableHeader
                  label={copy.organizations.columnCode}
                  columnKey="code"
                  activeKey={sort.sortKey}
                  direction={sort.direction}
                />
                <SortableHeader
                  label={copy.organizations.columnCountry}
                  columnKey="country"
                  activeKey={sort.sortKey}
                  direction={sort.direction}
                />
                <SortableHeader
                  label={copy.organizations.columnCurrency}
                  columnKey="currency"
                  activeKey={sort.sortKey}
                  direction={sort.direction}
                  className="hidden lg:table-cell"
                />
                <SortableHeader
                  label={copy.organizations.columnUsers}
                  columnKey="users"
                  activeKey={sort.sortKey}
                  direction={sort.direction}
                  align="right"
                  className="hidden lg:table-cell"
                />
                <SortableHeader
                  label={copy.organizations.columnWarehouses}
                  columnKey="warehouses"
                  activeKey={sort.sortKey}
                  direction={sort.direction}
                  align="right"
                  className="hidden xl:table-cell"
                />
                <SortableHeader
                  label={copy.organizations.columnCreatedAt}
                  columnKey="created"
                  activeKey={sort.sortKey}
                  direction={sort.direction}
                />
                <SortableHeader
                  label={copy.organizations.columnCreatedBy}
                  columnKey="createdBy"
                  activeKey={sort.sortKey}
                  direction={sort.direction}
                  className="hidden xl:table-cell"
                />
                <SortableHeader
                  label={copy.organizations.columnStatus}
                  columnKey="status"
                  activeKey={sort.sortKey}
                  direction={sort.direction}
                />
                <TableHeaderCell
                  label={copy.organizations.columnActions}
                  align="right"
                  isLabelHidden
                />
              </TableHeadRow>
              <tbody>
                {visible.map((company) => (
                  <TableRow key={company.id}>
                    {/* Esta columna absorbe el ancho sobrante y es la que cede
                        cuando falta sitio. Por eso el nombre se recorta aquí y
                        no en las columnas de datos, que son cortas y fijas. */}
                    <td className={`${TABLE_CELL_CLASS} w-full max-w-0`}>
                      <div className="flex items-center gap-3">
                        <Monogram text={company.code} />
                        <span className="min-w-0">
                          <Link
                            href={`/prototype/organizations/${company.id}` as never}
                            className="block truncate font-medium hover:underline"
                          >
                            {company.name}
                          </Link>
                          <span className="text-text-muted block truncate text-xs">
                            {company.legalName}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td
                      className={`${TABLE_CELL_CLASS} text-text-muted font-mono text-xs whitespace-nowrap`}
                    >
                      {company.code}
                    </td>
                    <td className={`${TABLE_CELL_CLASS} text-text-muted whitespace-nowrap`}>
                      <span className="flex items-center gap-2">
                        <CountryFlag countryCode={company.countryCode} className="h-4 w-4" />
                        {company.countryName}
                      </span>
                    </td>
                    <td
                      className={`${TABLE_CELL_CLASS} text-text-muted hidden whitespace-nowrap lg:table-cell`}
                    >
                      {company.currency}
                    </td>
                    <td
                      className={`${TABLE_CELL_CLASS} hidden text-right tabular-nums lg:table-cell`}
                    >
                      {formatQuantity(company.userCount)}
                    </td>
                    <td
                      className={`${TABLE_CELL_CLASS} hidden text-right tabular-nums xl:table-cell`}
                    >
                      {formatQuantity(company.warehouseCount)}
                    </td>
                    <td
                      className={`${TABLE_CELL_CLASS} text-text-muted whitespace-nowrap tabular-nums`}
                    >
                      {formatDate(company.createdAt)}
                    </td>
                    <td
                      className={`${TABLE_CELL_CLASS} text-text-muted hidden max-w-[11rem] truncate xl:table-cell`}
                    >
                      {company.createdByEmail}
                    </td>
                    {/* El interruptor surte efecto en el acto. La palabra al
                        lado dice el estado, porque el color no basta. */}
                    <td className={`${TABLE_CELL_CLASS} whitespace-nowrap`}>
                      <span className="flex items-center gap-2">
                        <Toggle
                          checked={company.active}
                          label={`${copy.organizations.toggleActive} · ${company.name}`}
                          onChange={(next) => setCompanyActive(company.id, next)}
                        />
                        <span
                          className={`text-xs ${
                            company.active ? 'text-success' : 'text-text-muted'
                          }`}
                        >
                          {company.active ? copy.status.active : copy.status.inactive}
                        </span>
                      </span>
                    </td>
                    <td className={`${TABLE_CELL_CLASS} text-right`}>
                      <CompanyRowMenu company={company} />
                    </td>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </TableBody>

        <TablePagination
          page={page}
          pageCount={pageCount}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          firstIndex={firstIndex}
          visibleCount={visible.length}
          totalCount={filtered.length}
          controlId="company-rows-per-page"
          defaultPageSize={DEFAULT_PAGE_SIZE}
        />
      </TableCard>
    </div>
  );
}

'use client';

/**
 * Lista de usuarios.
 *
 * Una persona existe una sola vez en la plataforma y alcanza tantas empresas
 * como se le concedan. Por eso la columna de empresas muestra un recuento y no
 * un nombre: quien tiene acceso a seis no cabe en una celda.
 *
 * Búsqueda, orden, página y tamaño viven en la dirección, igual que en la tabla
 * de empresas. En el prototipo se resuelven en el navegador; en la aplicación
 * real serán filtro, orden y límite en la consulta.
 */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Avatar } from '../../ui/avatar';
import { buttonClass } from '../../ui/button';
import { useCompanyStore } from '../../company-store';
import { useCopy } from '@/lib/i18n';
import { CountryFlag } from '../../ui/flag';
import { formatDate, formatQuantity } from '@/lib/format';
import { IconPlus } from '../../ui/icons';
import { TablePagination } from '../../ui/pagination';
import { SearchInput } from '../../ui/search-input';
import { SummaryCard, SummaryCardGrid } from '../../ui/summary-card';
import { TableBody, TableProgress } from '../../ui/table-loading';
import { useSimulatedQuery } from '../../simulated-query';
import { SortableHeader, sortRows, useTableSort } from '../../ui/table-sort';
import { Toggle } from '../../ui/toggle';
import { useUserStore } from '../../user-store';
import { findRole, type User } from '../../users-data';
import { UserRowMenu } from './user-row-menu';

const PAGE_SIZE_OPTIONS = [20, 40, 100] as const;
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

const SORT_ACCESSORS: Record<string, (user: User) => string | number | boolean> = {
  name: (user) => `${user.lastName} ${user.firstName}`,
  email: (user) => user.email,
  country: (user) => user.countryCode,
  companies: (user) => user.memberships.length,
  created: (user) => user.createdAt,
  status: (user) => user.active,
};

function matchesQuery(user: User, query: string): boolean {
  if (query === '') return true;
  return `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(query);
}

/** Los nombres de los roles que ocupa, sin repetir. */
function roleNames(user: User): readonly string[] {
  const names = new Set<string>();
  for (const membership of user.memberships) {
    const role = findRole(membership.roleCode);
    if (role !== undefined) names.add(role.name);
  }
  return [...names];
}

export function UsersView(): React.ReactElement {
  const copy = useCopy();

  const searchParams = useSearchParams();
  const { users, setUserActive } = useUserStore();
  const { companies } = useCompanyStore();

  const query = (searchParams.get('q') ?? '').trim().toLowerCase();

  const requestedSize = Number(searchParams.get('size'));
  const pageSize = PAGE_SIZE_OPTIONS.includes(
    requestedSize as (typeof PAGE_SIZE_OPTIONS)[number],
  )
    ? requestedSize
    : DEFAULT_PAGE_SIZE;

  // Por lo más reciente, igual que el resto de las listas: quien se acaba de
  // dar de alta es a quien se vuelve para revisar o corregir.
  const sort = useTableSort('created', 'desc');
  const filtered = sortRows(
    users.filter((user) => matchesQuery(user, query)),
    SORT_ACCESSORS[sort.sortKey],
    sort.direction,
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));

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

  const activeCount = users.filter((user) => user.active).length;
  const companiesReached = new Set(
    users.flatMap((user) => user.memberships.map((membership) => membership.companyId)),
  ).size;
  const adminCount = users.filter((user) =>
    user.memberships.some((membership) => membership.roleCode === 'admin'),
  ).length;

  function companyNamesFor(user: User): string {
    return user.memberships
      .map((membership) => companies.find((company) => company.id === membership.companyId))
      .filter((company) => company !== undefined)
      .map((company) => company.name)
      .join(', ');
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{copy.users.title}</h1>
          <p className="text-text-muted mt-1 text-sm">{copy.users.subtitle}</p>
        </div>

        <Link href={'/prototype/users/new' as never} className={buttonClass({ size: 'sm' })}>
          <IconPlus className="h-4 w-4" />
          {copy.users.create}
        </Link>
      </header>

      <SummaryCardGrid>
        <SummaryCard label={copy.users.totalUsers} value={formatQuantity(users.length)} />
        <SummaryCard label={copy.users.totalActive} value={formatQuantity(activeCount)} />
        <SummaryCard
          label={copy.users.totalCompaniesReached}
          value={formatQuantity(companiesReached)}
        />
        <SummaryCard label={copy.users.totalAdmins} value={formatQuantity(adminCount)} />
      </SummaryCardGrid>

      <div className="border-border bg-surface rounded-card border">
        <div className="border-border relative flex flex-wrap items-center gap-2 border-b p-3">
          <SearchInput placeholder={copy.users.searchPlaceholder} />
          <p className="text-text-muted ml-auto text-sm">
            {formatQuantity(filtered.length)} {copy.users.resultCount}
          </p>

          <TableProgress />
        </div>

        <TableBody>
          {visible.length === 0 ? (
            <p className="text-text-muted px-4 py-12 text-center text-sm">{copy.users.empty}</p>
          ) : (
            <div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-border bg-surface-muted text-text-muted border-b text-left text-xs tracking-wide uppercase">
                    <SortableHeader
                      label={copy.users.columnName}
                      columnKey="name"
                      activeKey={sort.sortKey}
                      direction={sort.direction}
                    />
                    <SortableHeader
                      label={copy.users.columnCountry}
                      columnKey="country"
                      activeKey={sort.sortKey}
                      direction={sort.direction}
                      className="hidden lg:table-cell"
                    />
                    <SortableHeader
                      label={copy.users.columnCompanies}
                      columnKey="companies"
                      activeKey={sort.sortKey}
                      direction={sort.direction}
                    />
                    <th scope="col" className="hidden px-4 py-2.5 font-medium xl:table-cell">
                      {copy.users.columnRoles}
                    </th>
                    <SortableHeader
                      label={copy.users.columnCreatedAt}
                      columnKey="created"
                      activeKey={sort.sortKey}
                      direction={sort.direction}
                      className="hidden lg:table-cell"
                    />
                    <SortableHeader
                      label={copy.users.columnStatus}
                      columnKey="status"
                      activeKey={sort.sortKey}
                      direction={sort.direction}
                    />
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">
                      <span className="sr-only">{copy.users.columnActions}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((user) => {
                    const companyNames = companyNamesFor(user);
                    return (
                      <tr
                        key={user.id}
                        className="border-border hover:bg-surface-muted border-b last:border-0"
                      >
                        {/* Nombre y correo juntos: identifican a la misma persona
                          y separarlos obliga a leer dos columnas para saber de
                          quién se habla. */}
                        <td className="w-[32%] max-w-0 px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <Avatar
                              name={`${user.firstName} ${user.lastName}`}
                              photoUrl={user.photoDataUrl}
                            />
                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/prototype/users/${user.id}/edit` as never}
                                className="block truncate font-medium hover:underline"
                              >
                                {user.firstName} {user.lastName}
                              </Link>
                              <span className="text-text-muted block truncate text-xs">
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="text-text-muted hidden px-4 py-2.5 whitespace-nowrap lg:table-cell">
                          <span className="flex items-center gap-2">
                            <CountryFlag countryCode={user.countryCode} className="h-4 w-4" />
                            {user.countryCode}
                          </span>
                        </td>

                        <td className="w-[28%] max-w-0 px-4 py-2.5">
                          {user.memberships.length === 0 ? (
                            <span className="text-text-muted text-xs">
                              {copy.users.noCompanies}
                            </span>
                          ) : (
                            <span className="block truncate" title={companyNames}>
                              {companyNames}
                            </span>
                          )}
                        </td>

                        <td className="text-text-muted hidden px-4 py-2.5 xl:table-cell">
                          <span className="flex flex-wrap gap-1">
                            {roleNames(user).map((name) => (
                              <span
                                key={name}
                                className="bg-surface-muted rounded-control px-1.5 py-0.5 text-xs whitespace-nowrap"
                              >
                                {name}
                              </span>
                            ))}
                          </span>
                        </td>

                        <td className="text-text-muted hidden px-4 py-2.5 whitespace-nowrap tabular-nums lg:table-cell">
                          {formatDate(user.createdAt)}
                        </td>

                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className="flex items-center gap-2">
                            <Toggle
                              checked={user.active}
                              label={`${copy.users.toggleActive} · ${user.firstName} ${user.lastName}`}
                              onChange={(next) => setUserActive(user.id, next)}
                            />
                            <span
                              className={`text-xs ${
                                user.active ? 'text-success' : 'text-text-muted'
                              }`}
                            >
                              {user.active ? copy.status.active : copy.status.inactive}
                            </span>
                          </span>
                        </td>

                        <td className="px-4 py-2.5 text-right">
                          <UserRowMenu user={user} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
          controlId="user-rows-per-page"
          defaultPageSize={DEFAULT_PAGE_SIZE}
        />
      </div>
    </div>
  );
}

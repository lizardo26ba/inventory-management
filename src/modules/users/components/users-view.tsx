/**
 * Lista de usuarios de toda la plataforma.
 *
 * Es un componente de servidor. Recibe la página ya consultada y la pinta: no
 * filtra, no ordena y no recorta, porque eso ya ocurrió en la base. Lo de cliente
 * son las hojas que necesitan reaccionar, y vienen de las primitivas
 * compartidas.
 *
 * El nombre y el correo van juntos en una columna: identifican a la misma
 * persona, y separarlos obliga a leer dos columnas para saber de quién se habla.
 *
 * Las cifras de arriba son de la plataforma entera y no las afecta la búsqueda.
 */

import Link from 'next/link';

import { Avatar } from '@/components/ui/avatar';
import { buttonClass } from '@/components/ui/button';
import { CountryFlag } from '@/components/ui/flag';
import { IconPlus } from '@/components/ui/icons';
import { PageHeader } from '@/components/ui/page-header';
import { TablePagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { SummaryCard, SummaryCardGrid } from '@/components/ui/summary-card';
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
import { TableBody, TableProgress } from '@/components/ui/table-loading';
import { SortableHeader } from '@/components/ui/table-sort';
import { Tag, TagRow } from '@/components/ui/tag';
import { formatDate, formatQuantity } from '@/lib/format';
import { getCopy } from '@/lib/i18n/server';

import { USERS_PATH, userEditPath } from '../routes';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, type UserListQuery } from '../schema';
import { type UserListItem, type UsersSummary } from '../types';
import { roleName } from './role-name';
import { UserRowMenu, UserStatusToggle } from './user-row-actions';

/** Los nombres de las empresas que alcanza, sin repetir y en una sola línea. */
function organizationNames(user: UserListItem): string {
  return [...new Set(user.accesses.map((access) => access.organizationName))].join(', ');
}

export async function UsersView({
  items,
  total,
  summary,
  query,
}: {
  readonly items: readonly UserListItem[];
  readonly total: number;
  readonly summary: UsersSummary;
  readonly query: UserListQuery;
}): Promise<React.ReactElement> {
  const copy = await getCopy();

  const pageCount = Math.max(1, Math.ceil(total / query.pageSize));
  const firstIndex = (query.page - 1) * query.pageSize;

  return (
    <div className="space-y-5">
      <PageHeader title={copy.users.title} subtitle={copy.users.subtitle}>
        <Link href={`${USERS_PATH}/new`} className={buttonClass({ size: 'sm' })}>
          <IconPlus className="h-4 w-4" />
          {copy.users.create}
        </Link>
      </PageHeader>

      <SummaryCardGrid>
        <SummaryCard label={copy.users.totalUsers} value={formatQuantity(summary.userCount)} />
        <SummaryCard
          label={copy.users.totalActive}
          value={formatQuantity(summary.activeCount)}
        />
        <SummaryCard
          label={copy.users.totalCompaniesReached}
          value={formatQuantity(summary.organizationsReached)}
        />
        <SummaryCard
          label={copy.users.totalAdmins}
          value={formatQuantity(summary.administratorCount)}
        />
      </SummaryCardGrid>

      <TableCard>
        <TableToolbar>
          <SearchInput placeholder={copy.users.searchPlaceholder} />
          <p className="text-text-muted ml-auto text-sm">
            {formatQuantity(total)} {copy.users.resultCount}
          </p>

          <TableProgress />
        </TableToolbar>

        <TableBody>
          {items.length === 0 ? (
            <TableEmpty message={query.search === '' ? copy.users.none : copy.users.empty} />
          ) : (
            <Table>
              <TableHeadRow>
                <SortableHeader
                  label={copy.users.columnName}
                  columnKey="name"
                  activeKey={query.sort}
                  direction={query.direction}
                />
                <SortableHeader
                  label={copy.users.columnCountry}
                  columnKey="country"
                  activeKey={query.sort}
                  direction={query.direction}
                  className="hidden lg:table-cell"
                />
                <SortableHeader
                  label={copy.users.columnCompanies}
                  columnKey="companies"
                  activeKey={query.sort}
                  direction={query.direction}
                />
                <TableHeaderCell
                  label={copy.users.columnRoles}
                  className="hidden xl:table-cell"
                />
                <SortableHeader
                  label={copy.users.columnCreatedAt}
                  columnKey="created"
                  activeKey={query.sort}
                  direction={query.direction}
                  className="hidden lg:table-cell"
                />
                <SortableHeader
                  label={copy.users.columnStatus}
                  columnKey="status"
                  activeKey={query.sort}
                  direction={query.direction}
                />
                <TableHeaderCell label={copy.users.columnActions} align="right" isLabelHidden />
              </TableHeadRow>
              <tbody>
                {items.map((user) => {
                  const fullName = `${user.firstName} ${user.lastName}`;
                  const companies = organizationNames(user);
                  const roles = [
                    ...new Set(
                      user.accesses.map((access) =>
                        roleName({ code: access.roleCode, name: access.roleName }, copy),
                      ),
                    ),
                  ];

                  return (
                    <TableRow key={user.id}>
                      <td className={`${TABLE_CELL_CLASS} w-[32%] max-w-0`}>
                        <div className="flex items-center gap-3">
                          <Avatar name={fullName} />
                          <div className="min-w-0 flex-1">
                            <Link
                              href={userEditPath(user.id)}
                              className="block truncate font-medium hover:underline"
                            >
                              {fullName}
                            </Link>
                            <span className="text-text-muted block truncate text-xs">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td
                        className={`${TABLE_CELL_CLASS} text-text-muted hidden whitespace-nowrap lg:table-cell`}
                      >
                        {user.countryCode === null ? (
                          '—'
                        ) : (
                          <span className="flex items-center gap-2">
                            <CountryFlag countryCode={user.countryCode} className="h-4 w-4" />
                            {user.countryCode}
                          </span>
                        )}
                      </td>

                      <td className={`${TABLE_CELL_CLASS} w-[28%] max-w-0`}>
                        {user.accesses.length === 0 ? (
                          <span className="text-text-muted text-xs">
                            {copy.users.noCompanies}
                          </span>
                        ) : (
                          <span className="block truncate" title={companies}>
                            {companies}
                          </span>
                        )}
                      </td>

                      <td
                        className={`${TABLE_CELL_CLASS} text-text-muted hidden xl:table-cell`}
                      >
                        <TagRow>
                          {/* El acceso de plataforma va primero y no es un rol:
                              alcanza a todas las empresas, así que enterarse de
                              que una cuenta lo tiene no puede depender de abrir
                              su ficha. */}
                          {user.isPlatformAdmin ? (
                            <Tag>{copy.userForm.platformBadge}</Tag>
                          ) : null}
                          {roles.map((name) => (
                            <Tag key={name}>{name}</Tag>
                          ))}
                        </TagRow>
                      </td>

                      <td
                        className={`${TABLE_CELL_CLASS} text-text-muted hidden whitespace-nowrap tabular-nums lg:table-cell`}
                      >
                        {formatDate(user.createdAt.toISOString())}
                      </td>

                      {/* Suspender surte efecto en el acto: cada petición vuelve
                          a leer el estado de la cuenta. RN-006. */}
                      <td className={`${TABLE_CELL_CLASS} whitespace-nowrap`}>
                        <UserStatusToggle
                          id={user.id}
                          name={fullName}
                          isActive={user.status === 'ACTIVE'}
                        />
                      </td>

                      <td className={`${TABLE_CELL_CLASS} text-right`}>
                        <UserRowMenu id={user.id} name={fullName} />
                      </td>
                    </TableRow>
                  );
                })}
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
          controlId="user-rows-per-page"
          defaultPageSize={DEFAULT_PAGE_SIZE}
        />
      </TableCard>
    </div>
  );
}

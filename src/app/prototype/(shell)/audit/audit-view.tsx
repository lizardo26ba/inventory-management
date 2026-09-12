'use client';

/**
 * Bitácora de auditoría.
 *
 * La lista responde a quién hizo qué y cuándo. El antes y después vive en el
 * panel de detalle, no en la fila.
 *
 * Los filtros que se usan de verdad al auditar son tres: rango de fechas, autor
 * y tipo de acción. Están arriba y viven en la dirección, así que una búsqueda
 * concreta se puede pasar por enlace a quien tenga que revisarla.
 *
 * Las acciones de privilegio elevado se marcan en la propia fila. Son las que
 * más importan en una revisión y no deberían obligar a abrir el detalle para
 * distinguirlas. RN-072.
 */

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { auditActions, auditEntries, findAuditAction, type AuditEntry } from '../../audit-data';
import { Avatar } from '../../ui/avatar';
import { useCopy } from '@/lib/i18n';
import { formatDateTime, formatQuantity } from '@/lib/format';
import { IconShield } from '../../ui/icons';
import { TablePagination } from '../../ui/pagination';
import { SearchInput } from '../../ui/search-input';
import { SummaryCard, SummaryCardGrid } from '../../ui/summary-card';
import { TableBody, TableProgress } from '../../ui/table-loading';
import { useSimulatedQuery } from '../../simulated-query';
import { SortableHeader, sortRows, useTableSort } from '../../ui/table-sort';
import { AuditDetail } from './audit-detail';

const PAGE_SIZE_OPTIONS = [20, 40, 100] as const;
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

const SORT_ACCESSORS: Record<string, (entry: AuditEntry) => string | number | boolean> = {
  when: (entry) => entry.createdAt,
  actor: (entry) => entry.actorName,
  action: (entry) => findAuditAction(entry.action)?.label ?? entry.action,
  entity: (entry) => entry.entityLabel,
  company: (entry) => entry.companyName ?? '',
};

const ACTORS = [...new Set(auditEntries.map((entry) => entry.actorEmail))];

export function AuditView(): React.ReactElement {
  const copy = useCopy();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);

  const query = (searchParams.get('q') ?? '').trim().toLowerCase();
  const actionFilter = searchParams.get('action') ?? '';
  const actorFilter = searchParams.get('actor') ?? '';
  const fromFilter = searchParams.get('from') ?? '';
  const toFilter = searchParams.get('to') ?? '';

  const requestedSize = Number(searchParams.get('size'));
  const pageSize = PAGE_SIZE_OPTIONS.includes(
    requestedSize as (typeof PAGE_SIZE_OPTIONS)[number],
  )
    ? requestedSize
    : DEFAULT_PAGE_SIZE;

  // La bitácora se lee de lo más reciente hacia atrás. Es el único listado del
  // sistema cuyo orden por defecto es descendente.
  const sort = useTableSort('when', 'desc');

  function matches(entry: AuditEntry): boolean {
    if (actionFilter !== '' && entry.action !== actionFilter) return false;
    if (actorFilter !== '' && entry.actorEmail !== actorFilter) return false;
    // Las fechas del filtro son días completos en tiempo universal, así que
    // basta comparar los diez primeros caracteres del instante.
    const day = entry.createdAt.slice(0, 10);
    if (fromFilter !== '' && day < fromFilter) return false;
    if (toFilter !== '' && day > toFilter) return false;
    if (query === '') return true;

    const action = findAuditAction(entry.action);
    const haystack =
      `${entry.entityLabel} ${entry.entityType} ${entry.actorName} ${entry.actorEmail} ${action?.label ?? ''} ${entry.companyName ?? ''} ${entry.correlationId}`.toLowerCase();
    return haystack.includes(query);
  }

  const filtered = sortRows(
    auditEntries.filter(matches),
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

  const elevatedCount = auditEntries.filter((entry) => entry.elevated).length;
  const companiesTouched = new Set(
    auditEntries.map((entry) => entry.companyId).filter((id) => id !== null),
  ).size;

  const hasFilters =
    query !== '' ||
    actionFilter !== '' ||
    actorFilter !== '' ||
    fromFilter !== '' ||
    toFilter !== '';

  function hrefWith(changes: Record<string, string | null>): string {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, next] of Object.entries(changes)) {
      if (next === null || next === '') params.delete(key);
      else params.set(key, next);
    }
    const suffix = params.toString();
    return suffix === '' ? pathname : `${pathname}?${suffix}`;
  }

  // Cambiar un filtro devuelve a la primera página: la número tres de un
  // resultado que ahora tiene una sola deja la tabla vacía sin motivo.
  function setParam(key: string, value: string): void {
    router.replace(hrefWith({ [key]: value, page: null }) as never, { scroll: false });
  }

  const openEntry = auditEntries.find((entry) => entry.id === openEntryId);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.audit.title}</h1>
        <p className="text-text-muted mt-1 text-sm">{copy.audit.subtitle}</p>
      </header>

      <SummaryCardGrid>
        <SummaryCard
          label={copy.audit.totalEntries}
          value={formatQuantity(auditEntries.length)}
        />
        <SummaryCard label={copy.audit.totalElevated} value={formatQuantity(elevatedCount)} />
        <SummaryCard label={copy.audit.totalActors} value={formatQuantity(ACTORS.length)} />
        <SummaryCard
          label={copy.audit.totalCompanies}
          value={formatQuantity(companiesTouched)}
        />
      </SummaryCardGrid>

      <div className="border-border bg-surface rounded-card border">
        <div className="border-border relative space-y-3 border-b p-3">
          <SearchInput placeholder={copy.audit.searchPlaceholder} />

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label
                htmlFor="audit-action"
                className="text-text-muted block text-xs font-medium"
              >
                {copy.audit.filterAction}
              </label>
              <select
                id="audit-action"
                value={actionFilter}
                onChange={(event) => setParam('action', event.target.value)}
                className="border-border bg-surface rounded-control mt-1 h-9 w-48 border px-2 text-sm"
              >
                <option value="">{copy.audit.filterAll}</option>
                {auditActions.map((action) => (
                  <option key={action.code} value={action.code}>
                    {action.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="audit-actor"
                className="text-text-muted block text-xs font-medium"
              >
                {copy.audit.filterActor}
              </label>
              <select
                id="audit-actor"
                value={actorFilter}
                onChange={(event) => setParam('actor', event.target.value)}
                className="border-border bg-surface rounded-control mt-1 h-9 w-56 border px-2 text-sm"
              >
                <option value="">{copy.audit.filterAll}</option>
                {ACTORS.map((email) => (
                  <option key={email} value={email}>
                    {email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="audit-from" className="text-text-muted block text-xs font-medium">
                {copy.audit.filterFrom}
              </label>
              <input
                id="audit-from"
                type="date"
                value={fromFilter}
                onChange={(event) => setParam('from', event.target.value)}
                className="border-border bg-surface rounded-control mt-1 h-9 border px-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="audit-to" className="text-text-muted block text-xs font-medium">
                {copy.audit.filterTo}
              </label>
              <input
                id="audit-to"
                type="date"
                value={toFilter}
                onChange={(event) => setParam('to', event.target.value)}
                className="border-border bg-surface rounded-control mt-1 h-9 border px-2 text-sm"
              />
            </div>

            {hasFilters ? (
              <Link
                href={pathname as never}
                scroll={false}
                className="text-primary h-9 self-end text-sm leading-9 hover:underline"
              >
                {copy.audit.clearFilters}
              </Link>
            ) : null}

            <p className="text-text-muted ml-auto self-end text-sm">
              {formatQuantity(filtered.length)} {copy.audit.resultCount}
            </p>
          </div>

          <TableProgress />
        </div>

        <TableBody>
          {visible.length === 0 ? (
            <p className="text-text-muted px-4 py-12 text-center text-sm">{copy.audit.empty}</p>
          ) : (
            <div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-border bg-surface-muted text-text-muted border-b text-left text-xs tracking-wide uppercase">
                    <SortableHeader
                      label={copy.audit.columnWhen}
                      columnKey="when"
                      activeKey={sort.sortKey}
                      direction={sort.direction}
                    />
                    <SortableHeader
                      label={copy.audit.columnActor}
                      columnKey="actor"
                      activeKey={sort.sortKey}
                      direction={sort.direction}
                    />
                    <SortableHeader
                      label={copy.audit.columnAction}
                      columnKey="action"
                      activeKey={sort.sortKey}
                      direction={sort.direction}
                    />
                    <SortableHeader
                      label={copy.audit.columnEntity}
                      columnKey="entity"
                      activeKey={sort.sortKey}
                      direction={sort.direction}
                      className="hidden lg:table-cell"
                    />
                    <SortableHeader
                      label={copy.audit.columnCompany}
                      columnKey="company"
                      activeKey={sort.sortKey}
                      direction={sort.direction}
                      className="hidden xl:table-cell"
                    />
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">
                      <span className="sr-only">{copy.audit.openDetail}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((entry) => {
                    const action = findAuditAction(entry.action);
                    return (
                      <tr
                        key={entry.id}
                        className="border-border hover:bg-surface-muted border-b last:border-0"
                      >
                        <td className="text-text-muted px-4 py-2.5 whitespace-nowrap tabular-nums">
                          {formatDateTime(entry.createdAt)}
                        </td>

                        <td className="w-[24%] max-w-0 px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={entry.actorName} className="h-7 w-7" />
                            <div className="min-w-0">
                              <span className="block truncate">{entry.actorName}</span>
                              {entry.elevated ? (
                                <span className="text-warning flex items-center gap-1 text-xs">
                                  <IconShield className="h-3 w-3" />
                                  {copy.audit.elevatedShort}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-2.5">
                          <span className="block">{action?.label ?? entry.action}</span>
                          <span className="text-text-muted block font-mono text-xs">
                            {entry.action}
                          </span>
                        </td>

                        <td className="hidden w-[20%] max-w-0 px-4 py-2.5 lg:table-cell">
                          <span className="block truncate">{entry.entityLabel}</span>
                          <span className="text-text-muted block truncate font-mono text-xs">
                            {entry.entityType}
                          </span>
                        </td>

                        <td className="text-text-muted hidden w-[18%] max-w-0 truncate px-4 py-2.5 xl:table-cell">
                          {entry.companyName ?? copy.audit.platformScope}
                        </td>

                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => setOpenEntryId(entry.id)}
                            className="border-border hover:bg-surface-muted rounded-control h-8 border px-3 text-xs transition-colors"
                          >
                            {copy.audit.openDetail}
                          </button>
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
          controlId="audit-rows-per-page"
          defaultPageSize={DEFAULT_PAGE_SIZE}
        />
      </div>

      {openEntry !== undefined ? (
        <AuditDetail entry={openEntry} onClose={() => setOpenEntryId(null)} />
      ) : null}
    </div>
  );
}

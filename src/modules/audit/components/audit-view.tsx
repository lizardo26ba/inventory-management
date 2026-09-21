/**
 * Bitácora de auditoría de la plataforma.
 *
 * Es un componente de servidor. Recibe la página ya consultada y la pinta: no
 * filtra, no ordena y no recorta, porque eso ya ocurrió en la base. Lo único de
 * cliente son las hojas que reaccionan, que son los filtros y el pie de
 * paginación, y vienen de las primitivas compartidas.
 *
 * Todo lo que decide qué se ve vive en la dirección: los filtros, la posición en
 * la lista y el registro abierto. Una revisión concreta se pasa por enlace a
 * quien tenga que verla.
 *
 * Tres decisiones que no se ven, impuestas por el tamaño de la tabla:
 *
 * - Pagina por cursor, sin total ni número de página.
 * - Los filtros son de coincidencia exacta y tienen índice detrás.
 * - Siempre de lo más reciente hacia atrás.
 *
 * Las acciones de privilegio elevado se marcan en la propia fila. Son las que más
 * importan en una revisión y no deberían obligar a abrir el detalle. RN-072.
 */

import Link from 'next/link';

import { CURSOR_PARAM_KEYS } from '@/components/ui/cursor-params';
import { CursorPagination } from '@/components/ui/cursor-pagination';
import { IconShield } from '@/components/ui/icons';
import { Avatar } from '@/components/ui/avatar';
import { PageHeader } from '@/components/ui/page-header';
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
import {
  ClearFiltersLink,
  DateFilter,
  FilterBar,
  SelectFilter,
  TextFilter,
} from '@/components/ui/url-filters';
import { formatDateTime } from '@/lib/format';
import { getCopy } from '@/lib/i18n/server';

import { AUDIT_PATH } from '../routes';
import {
  AUDIT_ENTRY_PARAM,
  AUDIT_PAGE_SIZE_OPTIONS,
  DEFAULT_AUDIT_PAGE_SIZE,
  PLATFORM_SCOPE,
} from '../schema';
import { AUDIT_ACTIONS, type AuditLogDetail, type AuditLogPage } from '../types';
import { auditActionName } from './action-name';
import { AuditDetail } from './audit-detail';

/** Los parámetros de la dirección que son filtros. */
const FILTER_PARAMS = ['action', 'company', 'actor', 'correlation', 'from', 'to'] as const;

/** Lo que un filtro nuevo deja sin sentido: la posición y el registro abierto. */
const RESET_ON_FILTER = [...CURSOR_PARAM_KEYS, AUDIT_ENTRY_PARAM] as const;

const PAGE_SIZE_PARAM = 'size';

export type CompanyOption = {
  readonly id: string;
  readonly name: string;
};

type Params = Readonly<Record<string, string | string[] | undefined>>;

function toSearchParams(params: Params): URLSearchParams {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first !== undefined && first !== '') search.set(key, first);
  }
  return search;
}

function hrefWith(params: Params, changes: Readonly<Record<string, string | null>>): string {
  const search = toSearchParams(params);
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) search.delete(key);
    else search.set(key, value);
  }
  const suffix = search.toString();
  return suffix === '' ? AUDIT_PATH : `${AUDIT_PATH}?${suffix}`;
}

export async function AuditView({
  page,
  params,
  companies,
  detail,
  pageSize,
}: {
  readonly page: AuditLogPage;
  readonly params: Params;
  readonly companies: readonly CompanyOption[];
  /** La entrada abierta en el panel, si la dirección pide una. */
  readonly detail: AuditLogDetail | null;
  readonly pageSize: number;
}): Promise<React.ReactElement> {
  const copy = await getCopy();

  const hasFilters = FILTER_PARAMS.some((key) => params[key] !== undefined);

  // La operación entera sustituye a los filtros que hubiera: lo que se quiere ver
  // es todo lo que salió de ese guardado, no la parte que casaba con otra cosa.
  function operationHref(correlationId: string): string {
    const size = params[PAGE_SIZE_PARAM];
    const kept = typeof size === 'string' ? { [PAGE_SIZE_PARAM]: size } : {};
    return hrefWith(kept, { correlation: correlationId });
  }

  return (
    <div className="space-y-5">
      <PageHeader title={copy.audit.title} subtitle={copy.audit.subtitle} />

      <TableCard>
        <TableToolbar>
          <FilterBar>
            <SelectFilter
              id="audit-action"
              param="action"
              label={copy.audit.filterAction}
              allLabel={copy.audit.filterAll}
              options={AUDIT_ACTIONS.map((code) => ({
                value: code,
                label: auditActionName(copy, code),
              }))}
              resetParams={RESET_ON_FILTER}
            />
            <SelectFilter
              id="audit-company"
              param="company"
              label={copy.audit.filterCompany}
              allLabel={copy.audit.filterAll}
              options={[
                { value: PLATFORM_SCOPE, label: copy.audit.platformScope },
                ...companies.map((company) => ({ value: company.id, label: company.name })),
              ]}
              resetParams={RESET_ON_FILTER}
            />
            <TextFilter
              id="audit-actor"
              param="actor"
              label={copy.audit.filterActor}
              placeholder={copy.audit.actorPlaceholder}
              resetParams={RESET_ON_FILTER}
            />
            <TextFilter
              id="audit-correlation"
              param="correlation"
              label={copy.audit.filterCorrelation}
              placeholder={copy.audit.correlationPlaceholder}
              resetParams={RESET_ON_FILTER}
            />
            <DateFilter
              id="audit-from"
              param="from"
              label={copy.audit.filterFrom}
              resetParams={RESET_ON_FILTER}
            />
            <DateFilter
              id="audit-to"
              param="to"
              label={copy.audit.filterTo}
              resetParams={RESET_ON_FILTER}
            />
            <ClearFiltersLink
              params={FILTER_PARAMS}
              label={copy.audit.clearFilters}
              resetParams={RESET_ON_FILTER}
            />
          </FilterBar>

          <TableProgress />
        </TableToolbar>

        <TableBody>
          {page.items.length === 0 ? (
            <TableEmpty message={hasFilters ? copy.audit.empty : copy.audit.none} />
          ) : (
            <Table>
              <TableHeadRow>
                <TableHeaderCell label={copy.audit.columnWhen} />
                <TableHeaderCell label={copy.audit.columnActor} />
                <TableHeaderCell label={copy.audit.columnAction} />
                <TableHeaderCell
                  label={copy.audit.columnEntity}
                  className="hidden lg:table-cell"
                />
                <TableHeaderCell
                  label={copy.audit.columnCompany}
                  className="hidden xl:table-cell"
                />
                <TableHeaderCell label={copy.audit.openDetail} align="right" isLabelHidden />
              </TableHeadRow>
              <tbody>
                {page.items.map((entry) => (
                  <TableRow key={entry.id}>
                    <td
                      className={`${TABLE_CELL_CLASS} text-text-muted whitespace-nowrap tabular-nums`}
                    >
                      {formatDateTime(entry.createdAt.toISOString())}
                    </td>

                    <td className={`${TABLE_CELL_CLASS} w-[24%] max-w-0`}>
                      {entry.actor === null ? (
                        <span className="text-text-muted block truncate italic">
                          {copy.audit.noActor}
                        </span>
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <Avatar name={entry.actor.name} className="h-7 w-7" />
                          <div className="min-w-0">
                            <span className="block truncate">{entry.actor.name}</span>
                            {entry.actingAsPlatformAdmin ? (
                              <span className="text-warning flex items-center gap-1 text-xs">
                                <IconShield className="h-3 w-3" />
                                {copy.audit.elevatedShort}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </td>

                    <td className={TABLE_CELL_CLASS}>
                      <span className="block">{auditActionName(copy, entry.action)}</span>
                      <span className="text-text-muted block font-mono text-xs">
                        {entry.action}
                      </span>
                    </td>

                    <td className={`${TABLE_CELL_CLASS} hidden w-[20%] max-w-0 lg:table-cell`}>
                      <span className="block truncate">
                        {entry.entityLabel ?? copy.audit.emptyValue}
                      </span>
                      <span className="text-text-muted block truncate font-mono text-xs">
                        {entry.entityType}
                      </span>
                    </td>

                    <td
                      className={`${TABLE_CELL_CLASS} text-text-muted hidden w-[18%] max-w-0 truncate xl:table-cell`}
                    >
                      {entry.organizationName ?? copy.audit.platformScope}
                    </td>

                    <td className={`${TABLE_CELL_CLASS} text-right`}>
                      <Link
                        href={hrefWith(params, { [AUDIT_ENTRY_PARAM]: entry.id }) as never}
                        scroll={false}
                        className="border-border hover:bg-surface-muted rounded-control inline-flex h-8 items-center border px-3 text-xs whitespace-nowrap transition-colors"
                      >
                        {copy.audit.openDetail}
                      </Link>
                    </td>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </TableBody>

        <CursorPagination
          newerCursor={page.newerCursor}
          olderCursor={page.olderCursor}
          visibleCount={page.items.length}
          pageSize={pageSize}
          pageSizeOptions={AUDIT_PAGE_SIZE_OPTIONS}
          defaultPageSize={DEFAULT_AUDIT_PAGE_SIZE}
          controlId="audit-rows-per-page"
        />
      </TableCard>

      {detail === null ? null : (
        <AuditDetail
          entry={detail}
          closeHref={hrefWith(params, { [AUDIT_ENTRY_PARAM]: null })}
          operationHref={operationHref(detail.correlationId)}
        />
      )}
    </div>
  );
}

'use client';

/**
 * Bitácora de auditoría.
 *
 * La lista responde a quién hizo qué y cuándo. El antes y después vive en el
 * panel de detalle, no en la fila.
 *
 * Todo lo que decide qué se ve vive en la dirección: los filtros, la posición en
 * la lista y el registro abierto. Una revisión concreta se pasa por enlace a
 * quien tenga que verla, y la pantalla real hará esa misma consulta en el
 * servidor.
 *
 * Tres decisiones que no se ven y que impone el tamaño de la tabla, que es la
 * que más crece del sistema:
 *
 * - Pagina por cursor, sin total ni número de página. Contar o saltar páginas
 *   recorre la tabla entera.
 * - Los filtros son exactos: acción, empresa, autor, correlación y fechas. Una
 *   búsqueda por fragmento no tiene índice que la sostenga.
 * - Siempre de lo más reciente hacia atrás. Ordenar por autor o por acción
 *   pediría un índice por cada columna.
 *
 * Por eso tampoco hay cifras arriba: cualquiera de ellas contaría la tabla entera
 * en cada visita.
 *
 * Las acciones de privilegio elevado se marcan en la propia fila. Son las que
 * más importan en una revisión y no deberían obligar a abrir el detalle para
 * distinguirlas. RN-072.
 *
 * Una entrada puede no tener autor: el bloqueo por intentos fallidos ocurre sin
 * que nadie haya iniciado sesión. La fila lo dice en lugar de dejar un hueco.
 */

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import {
  auditCompanies,
  auditEntries,
  pageAuditEntries,
  type AuditActionCode,
  type AuditEntry,
} from '../../audit-data';
import { Avatar } from '../../ui/avatar';
import { useCopy } from '@/lib/i18n';
import { formatDateTime } from '@/lib/format';
import { CURSOR_PARAMS, CURSOR_PARAM_KEYS, CursorPagination } from '../../ui/cursor-pagination';
import { IconShield } from '../../ui/icons';
import { useSimulatedQuery } from '../../simulated-query';
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
import {
  ClearFiltersLink,
  DateFilter,
  FilterBar,
  SelectFilter,
  TextFilter,
} from '../../ui/url-filters';
import { AuditDetail } from './audit-detail';

const PAGE_SIZE_OPTIONS = [20, 40, 100] as const;
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];
const PAGE_SIZE_PARAM = 'size';

/** El registro abierto en el panel. */
const ENTRY_PARAM = 'entry';

const FILTER_PARAMS = {
  action: 'action',
  company: 'company',
  actor: 'actor',
  correlation: 'correlation',
  from: 'from',
  to: 'to',
} as const;

const FILTER_PARAM_KEYS = Object.values(FILTER_PARAMS);

/** Lo que un filtro nuevo deja sin sentido: la posición y el registro abierto. */
const RESET_ON_FILTER = [...CURSOR_PARAM_KEYS, ENTRY_PARAM] as const;

/** El valor del filtro de empresa para lo que no afecta a ninguna. */
const PLATFORM_COMPANY = 'platform';

export function AuditView(): React.ReactElement {
  const copy = useCopy();

  const pathname = usePathname();
  const searchParams = useSearchParams();

  const actionFilter = searchParams.get(FILTER_PARAMS.action) ?? '';
  const companyFilter = searchParams.get(FILTER_PARAMS.company) ?? '';
  const actorFilter = (searchParams.get(FILTER_PARAMS.actor) ?? '').toLowerCase();
  const correlationFilter = searchParams.get(FILTER_PARAMS.correlation) ?? '';
  const fromFilter = searchParams.get(FILTER_PARAMS.from) ?? '';
  const toFilter = searchParams.get(FILTER_PARAMS.to) ?? '';

  const requestedSize = Number(searchParams.get(PAGE_SIZE_PARAM));
  const pageSize = PAGE_SIZE_OPTIONS.includes(
    requestedSize as (typeof PAGE_SIZE_OPTIONS)[number],
  )
    ? requestedSize
    : DEFAULT_PAGE_SIZE;

  // Las claves del diccionario son los códigos del catálogo real. Una prueba
  // comprueba que coinciden, así que recorrerlas es recorrer el catálogo.
  const actionCodes = Object.keys(copy.auditActions) as AuditActionCode[];

  function matches(entry: AuditEntry): boolean {
    if (actionFilter !== '' && entry.action !== actionFilter) return false;
    if (companyFilter === PLATFORM_COMPANY && entry.organizationId !== null) return false;
    if (
      companyFilter !== '' &&
      companyFilter !== PLATFORM_COMPANY &&
      entry.organizationId !== companyFilter
    ) {
      return false;
    }
    if (actorFilter !== '' && entry.actor?.email.toLowerCase() !== actorFilter) return false;
    if (correlationFilter !== '' && entry.correlationId !== correlationFilter) return false;
    // Los días del filtro son días completos en tiempo universal. La plataforma no
    // tiene zona propia, y esa es la zona en la que hoy se pintan las fechas.
    const day = entry.createdAt.slice(0, 10);
    if (fromFilter !== '' && day < fromFilter) return false;
    if (toFilter !== '' && day > toFilter) return false;
    return true;
  }

  const page = pageAuditEntries(
    auditEntries.filter(matches),
    {
      older: searchParams.get(CURSOR_PARAMS.older),
      newer: searchParams.get(CURSOR_PARAMS.newer),
    },
    pageSize,
  );

  // Toda consulta nueva (filtrar, moverse o cambiar el tamaño) enciende la barra
  // de la cabecera. La firma es el conjunto de parámetros de la dirección, que es
  // exactamente lo que viajará a la consulta real.
  useSimulatedQuery(searchParams.toString());

  function hrefWith(changes: Readonly<Record<string, string | null>>): string {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, next] of Object.entries(changes)) {
      if (next === null || next === '') params.delete(key);
      else params.set(key, next);
    }
    const suffix = params.toString();
    return suffix === '' ? pathname : `${pathname}?${suffix}`;
  }

  // La operación entera sustituye a los filtros que hubiera: lo que se quiere ver
  // es todo lo que salió de ese guardado, no la parte que casaba con otra cosa.
  function operationHref(entry: AuditEntry): string {
    const params = new URLSearchParams();
    const size = searchParams.get(PAGE_SIZE_PARAM);
    if (size !== null) params.set(PAGE_SIZE_PARAM, size);
    params.set(FILTER_PARAMS.correlation, entry.correlationId);
    return `${pathname}?${params.toString()}`;
  }

  const hasFilters = FILTER_PARAM_KEYS.some((key) => searchParams.has(key));

  const openEntryId = searchParams.get(ENTRY_PARAM);
  const openEntry =
    openEntryId === null ? undefined : auditEntries.find((entry) => entry.id === openEntryId);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.audit.title}</h1>
        <p className="text-text-muted mt-1 text-sm">{copy.audit.subtitle}</p>
      </header>

      <TableCard>
        <TableToolbar>
          <FilterBar>
            <SelectFilter
              id="audit-action"
              param={FILTER_PARAMS.action}
              label={copy.audit.filterAction}
              allLabel={copy.audit.filterAll}
              options={actionCodes.map((code) => ({
                value: code,
                label: copy.auditActions[code],
              }))}
              resetParams={RESET_ON_FILTER}
            />
            <SelectFilter
              id="audit-company"
              param={FILTER_PARAMS.company}
              label={copy.audit.filterCompany}
              allLabel={copy.audit.filterAll}
              options={[
                { value: PLATFORM_COMPANY, label: copy.audit.platformScope },
                ...auditCompanies.map((company) => ({
                  value: company.id,
                  label: company.name,
                })),
              ]}
              resetParams={RESET_ON_FILTER}
            />
            <TextFilter
              id="audit-actor"
              param={FILTER_PARAMS.actor}
              label={copy.audit.filterActor}
              placeholder={copy.audit.actorPlaceholder}
              resetParams={RESET_ON_FILTER}
            />
            <TextFilter
              id="audit-correlation"
              param={FILTER_PARAMS.correlation}
              label={copy.audit.filterCorrelation}
              placeholder={copy.audit.correlationPlaceholder}
              resetParams={RESET_ON_FILTER}
            />
            <DateFilter
              id="audit-from"
              param={FILTER_PARAMS.from}
              label={copy.audit.filterFrom}
              resetParams={RESET_ON_FILTER}
            />
            <DateFilter
              id="audit-to"
              param={FILTER_PARAMS.to}
              label={copy.audit.filterTo}
              resetParams={RESET_ON_FILTER}
            />
            <ClearFiltersLink
              params={FILTER_PARAM_KEYS}
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
                      {formatDateTime(entry.createdAt)}
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
                      <span className="block">{copy.auditActions[entry.action]}</span>
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
                        href={hrefWith({ [ENTRY_PARAM]: entry.id }) as never}
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
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          defaultPageSize={DEFAULT_PAGE_SIZE}
          controlId="audit-rows-per-page"
        />
      </TableCard>

      {openEntry !== undefined ? (
        <AuditDetail
          entry={openEntry}
          closeHref={hrefWith({ [ENTRY_PARAM]: null })}
          operationHref={operationHref(openEntry)}
        />
      ) : null}
    </div>
  );
}

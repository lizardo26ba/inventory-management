import { CursorPagination } from '@/components/ui/cursor-pagination';
import {
  TABLE_CELL_CLASS,
  Table,
  TableCard,
  TableHeadRow,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';

import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  SAMPLE_ROWS,
  type SampleRow,
  pageSizeFrom,
} from '../sample-list';
import { CatalogHeader, Specimen, requireEntry } from '../specimen';

/**
 * Lo que haría el repositorio con una consulta por cursor, sobre la lista
 * inventada: las filas justo antes o justo después de la frontera, sin contar
 * el total.
 */
function sliceAtCursor(
  pageSize: number,
  older: number | undefined,
  newer: number | undefined,
): {
  readonly rows: readonly SampleRow[];
  readonly isAtNewest: boolean;
  readonly hasOlder: boolean;
} {
  if (newer !== undefined) {
    const after = SAMPLE_ROWS.filter((row) => row.id > newer);
    const rows = after.slice(-pageSize);
    const firstRow = rows[0];
    return {
      rows,
      isAtNewest: firstRow === undefined || firstRow.id === SAMPLE_ROWS[0]?.id,
      hasOlder: true,
    };
  }

  const candidates =
    older === undefined ? SAMPLE_ROWS : SAMPLE_ROWS.filter((row) => row.id < older);
  const rows = candidates.slice(0, pageSize);
  return { rows, isAtNewest: older === undefined, hasOlder: candidates.length > pageSize };
}

function cursorFrom(raw: string | undefined): number | undefined {
  const value = Number(raw);
  return raw !== undefined && Number.isInteger(value) ? value : undefined;
}

export default async function CursorPaginationCatalogPage({
  searchParams,
}: {
  readonly searchParams: Promise<{
    readonly older?: string;
    readonly newer?: string;
    readonly size?: string;
  }>;
}): Promise<React.ReactElement> {
  const entry = requireEntry('cursor-pagination');
  const params = await searchParams;

  const pageSize = pageSizeFrom(params.size);
  const { rows, isAtNewest, hasOlder } = sliceAtCursor(
    pageSize,
    cursorFrom(params.older),
    cursorFrom(params.newer),
  );
  const firstRow = rows[0];
  const lastRow = rows[rows.length - 1];

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Por cursor, sin total"
        description="Para las listas que crecen sin techo. No hay número de página ni salto al final: contar sería la consulta cara que se evita. La frontera viaja en ?older= o ?newer=."
        usage={`<CursorPagination\n  newerCursor={newer} olderCursor={older}\n  visibleCount={rows.length}\n  pageSize={pageSize} pageSizeOptions={[10, 25, 50]} defaultPageSize={10}\n  controlId="audit-rows-per-page"\n/>`}
      >
        <TableCard>
          <Table>
            <TableHeadRow>
              <TableHeaderCell label="Número" />
              <TableHeaderCell label="Descripción" />
            </TableHeadRow>
            <tbody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <td className={`${TABLE_CELL_CLASS} tabular-nums`}>{row.id}</td>
                  <td className={TABLE_CELL_CLASS}>{row.label}</td>
                </TableRow>
              ))}
            </tbody>
          </Table>
          <CursorPagination
            newerCursor={isAtNewest || firstRow === undefined ? null : String(firstRow.id)}
            olderCursor={!hasOlder || lastRow === undefined ? null : String(lastRow.id)}
            visibleCount={rows.length}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            defaultPageSize={DEFAULT_PAGE_SIZE}
            controlId="catalog-cursor-rows-per-page"
          />
        </TableCard>
      </Specimen>
    </>
  );
}

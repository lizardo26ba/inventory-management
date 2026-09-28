import { TablePagination } from '@/components/ui/pagination';
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
  pageSizeFrom,
  positiveIntegerOr,
} from '../sample-list';
import { CatalogHeader, Specimen, requireEntry } from '../specimen';

const FIRST_PAGE = 1;

export default async function PaginationCatalogPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly page?: string; readonly size?: string }>;
}): Promise<React.ReactElement> {
  const entry = requireEntry('pagination');
  const params = await searchParams;

  const pageSize = pageSizeFrom(params.size);
  const pageCount = Math.ceil(SAMPLE_ROWS.length / pageSize);
  const page = Math.min(positiveIntegerOr(params.page, FIRST_PAGE), pageCount);
  const firstIndex = (page - 1) * pageSize;
  const rows = SAMPLE_ROWS.slice(firstIndex, firstIndex + pageSize);

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Páginas numeradas"
        description="Cuatro saltos, que son enlaces. En el extremo se apagan en lugar de desaparecer, para que nada se mueva. El tamaño de partida no se escribe en la dirección."
        usage={`<TablePagination\n  page={page} pageCount={pageCount}\n  pageSize={pageSize} pageSizeOptions={[10, 25, 50]} defaultPageSize={10}\n  firstIndex={firstIndex} visibleCount={rows.length} totalCount={total}\n  controlId="products-rows-per-page"\n/>`}
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
          <TablePagination
            page={page}
            pageCount={pageCount}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            firstIndex={firstIndex}
            visibleCount={rows.length}
            totalCount={SAMPLE_ROWS.length}
            controlId="catalog-rows-per-page"
            defaultPageSize={DEFAULT_PAGE_SIZE}
          />
        </TableCard>
      </Specimen>
    </>
  );
}

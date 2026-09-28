import {
  ClearFiltersLink,
  DateFilter,
  FilterBar,
  SelectFilter,
  TextFilter,
} from '@/components/ui/url-filters';

import { CatalogHeader, Specimen, requireEntry } from '../specimen';

const FILTER_PARAMS = ['kind', 'from', 'email'] as const;
/** Lo que deja de tener sentido cuando cambia un filtro. */
const RESET_PARAMS = ['page'] as const;

const MOVEMENT_KINDS = [
  { value: 'entry', label: 'Entrada' },
  { value: 'exit', label: 'Salida' },
  { value: 'transfer', label: 'Traslado' },
  { value: 'adjustment', label: 'Ajuste' },
] as const;

export default async function UrlFiltersCatalogPage({
  searchParams,
}: {
  readonly searchParams: Promise<Readonly<Record<string, string | undefined>>>;
}): Promise<React.ReactElement> {
  const entry = requireEntry('url-filters');
  const params = await searchParams;
  const received = FILTER_PARAMS.filter((key) => params[key] !== undefined)
    .map((key) => `${key}=${params[key]}`)
    .join(' · ');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Barra de filtros"
        description="Cada filtro escribe su parámetro y borra los que dependían del resultado anterior. El de texto es de coincidencia exacta. Limpiar solo aparece si hay algo puesto."
        usage={`<FilterBar>\n  <SelectFilter id="kind" param="kind" label="Tipo" allLabel="Todos" options={…} resetParams={['page']} />\n  <DateFilter id="from" param="from" label="Desde" resetParams={['page']} />\n  <ClearFiltersLink params={['kind', 'from']} label="Limpiar filtros" resetParams={['page']} />\n</FilterBar>`}
      >
        <div className="space-y-3">
          <FilterBar>
            <SelectFilter
              id="catalog-filter-kind"
              param="kind"
              label="Tipo"
              allLabel="Todos"
              options={MOVEMENT_KINDS}
              resetParams={RESET_PARAMS}
            />
            <DateFilter
              id="catalog-filter-from"
              param="from"
              label="Desde"
              resetParams={RESET_PARAMS}
            />
            <TextFilter
              id="catalog-filter-email"
              param="email"
              label="Correo de quien lo hizo"
              placeholder="persona@example.test"
              resetParams={RESET_PARAMS}
            />
            <ClearFiltersLink
              params={FILTER_PARAMS}
              label="Limpiar filtros"
              resetParams={RESET_PARAMS}
            />
          </FilterBar>
          <p className="text-text-muted text-sm">
            El servidor recibió:{' '}
            <code className="font-mono">{received === '' ? '(nada)' : received}</code>
          </p>
        </div>
      </Specimen>
    </>
  );
}

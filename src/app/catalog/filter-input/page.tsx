import { CatalogHeader, Specimen, requireEntry } from '../specimen';
import { FilterInputDemo } from './demo';

export default function FilterInputCatalogPage(): React.ReactElement {
  const entry = requireEntry('filter-input');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Filtrar lo que ya está en pantalla"
        description="Filtra en el navegador una lista corta que ya llegó entera. No toca la dirección: para buscar en el servidor está el buscador."
        usage={`<FilterInput value={query} onChange={setQuery} placeholder="Filtrar permisos" />`}
      >
        <FilterInputDemo />
      </Specimen>
    </>
  );
}

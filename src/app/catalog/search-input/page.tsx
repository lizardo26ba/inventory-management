import { SearchInput } from '@/components/ui/search-input';

import { CatalogHeader, Specimen, requireEntry } from '../specimen';

export default async function SearchInputCatalogPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly q?: string }>;
}): Promise<React.ReactElement> {
  const entry = requireEntry('search-input');
  const { q } = await searchParams;

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Búsqueda en la dirección"
        description="Escribe: tras una pausa corta, el texto pasa a ?q= y la página vuelve a pintarse en el servidor. Quien busca de verdad es el servidor."
        usage={`<SearchInput placeholder="Buscar productos" />`}
      >
        <div className="space-y-3">
          <SearchInput placeholder="Buscar productos" />
          <p className="text-text-muted text-sm">
            El servidor recibió:{' '}
            <code className="font-mono">{q === undefined ? '(nada)' : `q=${q}`}</code>
          </p>
        </div>
      </Specimen>
    </>
  );
}

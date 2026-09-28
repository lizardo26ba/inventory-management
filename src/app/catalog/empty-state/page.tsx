import Link from 'next/link';

import { EMPTY_STATE_LINK_CLASS, EmptyState } from '@/components/ui/empty-state';

import { CATALOG_PATH } from '../paths';
import { CatalogHeader, Specimen, requireEntry } from '../specimen';

export default function EmptyStateCatalogPage(): React.ReactElement {
  const entry = requireEntry('empty-state');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Con título"
        description="Una pantalla que sustituye a otra: dice en una línea qué pasó y luego lo explica. Siempre lleva salida."
        usage={`<EmptyState title="…" message="…">\n  <Link href="…" className={EMPTY_STATE_LINK_CLASS}>…</Link>\n</EmptyState>`}
      >
        <EmptyState
          title="No encontramos este producto"
          message="Puede que lo hayan eliminado o que la dirección esté mal escrita."
        >
          <Link href={CATALOG_PATH} className={EMPTY_STATE_LINK_CLASS}>
            Volver a la lista
          </Link>
        </EmptyState>
      </Specimen>

      <Specimen title="Sin título" description="Cuando el mensaje ya es la línea.">
        <EmptyState message="Todavía no hay movimientos en este almacén.">
          <Link href={CATALOG_PATH} className={EMPTY_STATE_LINK_CLASS}>
            Registrar una entrada
          </Link>
        </EmptyState>
      </Specimen>
    </>
  );
}

import Link from 'next/link';

import { buttonClass } from '@/components/ui/button';
import { IconPlus } from '@/components/ui/icons';
import { PageHeader } from '@/components/ui/page-header';

import { CATALOG_PATH } from '../paths';
import { CatalogHeader, Specimen, requireEntry } from '../specimen';

export default function PageHeaderCatalogPage(): React.ReactElement {
  const entry = requireEntry('page-header');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Primer nivel, con acción"
        description="Sin enlace de vuelta: la navegación del marco ya dice dónde se está. La acción principal va a la derecha del título."
        usage={`<PageHeader title="…" subtitle="…">\n  <Link href="…" className={buttonClass({ size: 'sm' })}>…</Link>\n</PageHeader>`}
      >
        <PageHeader title="Productos" subtitle="Todo lo que la empresa compra, guarda o vende.">
          <Link href={CATALOG_PATH} className={buttonClass({ size: 'sm' })}>
            <IconPlus className="h-4 w-4" />
            Nuevo producto
          </Link>
        </PageHeader>
      </Specimen>

      <Specimen
        title="Segundo nivel, con vuelta"
        description="El enlace de vuelta va encima del título: quien se equivocó de pantalla se va antes de leer el resto."
        usage={`<PageHeader title="…" back={{ href: '…', label: '…' }} />`}
      >
        <PageHeader
          title="Guantes de nitrilo, talla M"
          subtitle="PRD-0142"
          back={{ href: CATALOG_PATH, label: 'Volver a productos' }}
        />
      </Specimen>
    </>
  );
}

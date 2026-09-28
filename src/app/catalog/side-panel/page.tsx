import Link from 'next/link';

import { buttonClass } from '@/components/ui/button';
import { DefinitionList, DefinitionRow } from '@/components/ui/definition-list';
import { SidePanel } from '@/components/ui/side-panel';

import { CATALOG_PATH } from '../paths';
import { CatalogHeader, Specimen, requireEntry } from '../specimen';

const PANEL_PATH = `${CATALOG_PATH}/side-panel`;
const OPEN_PARAM = 'detail';

export default async function SidePanelCatalogPage({
  searchParams,
}: {
  readonly searchParams: Promise<Readonly<Record<string, string | undefined>>>;
}): Promise<React.ReactElement> {
  const entry = requireEntry('side-panel');
  const params = await searchParams;
  const isOpen = params[OPEN_PARAM] !== undefined;

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Detalle abierto desde la dirección"
        description="Se abre con un parámetro y se cierra volviendo a la dirección sin él. Es modal: el foco entra, el tabulador no sale, Escape cierra y el foco vuelve."
        usage={`{detailId !== undefined ? (\n  <SidePanel title="…" closeHref="/audit" closeLabel="Cerrar">…</SidePanel>\n) : null}`}
      >
        <Link
          href={`${PANEL_PATH}?${OPEN_PARAM}=1`}
          scroll={false}
          className={buttonClass({ variant: 'secondary', size: 'sm' })}
        >
          Abrir el panel
        </Link>
      </Specimen>

      {isOpen ? (
        <SidePanel
          eyebrow="Movimiento"
          title="Entrada de mercadería"
          subtitle="Almacén central · 28 de septiembre de 2026"
          closeHref={PANEL_PATH}
          closeLabel="Cerrar"
          footer={
            <Link
              href={PANEL_PATH}
              className={buttonClass({ variant: 'secondary', size: 'sm' })}
            >
              Ver el producto
            </Link>
          }
        >
          <DefinitionList>
            <DefinitionRow label="Producto">Guantes de nitrilo, talla M</DefinitionRow>
            <DefinitionRow label="Cantidad">240</DefinitionRow>
            <DefinitionRow label="Registró">Ana Morales</DefinitionRow>
          </DefinitionList>
        </SidePanel>
      ) : null}
    </>
  );
}

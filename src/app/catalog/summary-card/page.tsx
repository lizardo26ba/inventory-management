import { SummaryCard, SummaryCardGrid } from '@/components/ui/summary-card';

import { CatalogHeader, Specimen, requireEntry } from '../specimen';

export default function SummaryCardCatalogPage(): React.ReactElement {
  const entry = requireEntry('summary-card');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Rejilla de cifras"
        description="Cuatro columnas en pantalla ancha, dos en mediana, una en teléfono. La rejilla viaja con la tarjeta."
        usage={`<SummaryCardGrid>\n  <SummaryCard label="Productos" value="1 284" />\n</SummaryCardGrid>`}
      >
        <SummaryCardGrid>
          <SummaryCard label="Productos" value="1 284" />
          <SummaryCard label="Almacenes" value="3" />
          <SummaryCard label="Bajo mínimo" value="17" />
          <SummaryCard label="Valor del inventario" value="Q 482 910,50" />
        </SummaryCardGrid>
      </Specimen>
    </>
  );
}

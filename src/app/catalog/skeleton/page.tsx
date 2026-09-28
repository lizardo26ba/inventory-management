import {
  DetailPageSkeleton,
  FormPageSkeleton,
  ListPageSkeleton,
  SkeletonRegion,
  TableSkeleton,
} from '@/components/ui/skeleton';

import { CatalogHeader, Specimen, requireEntry } from '../specimen';

export default function SkeletonCatalogPage(): React.ReactElement {
  const entry = requireEntry('skeleton');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Tabla"
        description="Columnas y filas se pasan desde fuera para que el hueco mida lo mismo que la tabla que lo sustituye."
        usage={`<SkeletonRegion label="…">\n  <TableSkeleton columns={4} rows={3} />\n</SkeletonRegion>`}
      >
        <SkeletonRegion label="Cargando la tabla">
          <TableSkeleton columns={4} rows={3} />
        </SkeletonRegion>
      </Specimen>

      <Specimen
        title="Pantalla de lista"
        description="Lo que pinta un loading.tsx de lista: encabezado, cifras y tabla."
        usage={`<ListPageSkeleton columns={5} />`}
      >
        <ListPageSkeleton columns={5} summaryCards={2} />
      </Specimen>

      <Specimen title="Pantalla de formulario" usage={`<FormPageSkeleton sections={2} />`}>
        <FormPageSkeleton sections={1} />
      </Specimen>

      <Specimen title="Pantalla de detalle" usage={`<DetailPageSkeleton />`}>
        <DetailPageSkeleton />
      </Specimen>
    </>
  );
}

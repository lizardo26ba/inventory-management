import { Notice } from '@/components/ui/notice';

import { CatalogHeader, Specimen, requireEntry } from '../specimen';

export default function NoticeCatalogPage(): React.ReactElement {
  const entry = requireEntry('notice');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Advertencia"
        description="El tono de partida: una consecuencia que no se ve en el control que la produce."
        usage={`<Notice>…</Notice>`}
      >
        <Notice>
          Quien tenga este rol podrá ver los costos de todos los almacenes, no solo los suyos.
        </Notice>
      </Specimen>

      <Specimen title="Información" usage={`<Notice tone="info">…</Notice>`}>
        <Notice tone="info">
          Los cambios de precio se aplican a los documentos nuevos. Los ya emitidos conservan el
          suyo.
        </Notice>
      </Specimen>

      <Specimen title="Texto largo" description="Se parte en líneas; el marco crece con él.">
        <Notice>
          Suspender la empresa cierra la sesión de todas las personas que trabajan en ella y
          nadie podrá registrar movimientos, compras ni ventas hasta que se reactive. Las
          existencias, los documentos y la bitácora se conservan tal cual, y al reactivarla todo
          vuelve a estar disponible sin pérdida.
        </Notice>
      </Specimen>
    </>
  );
}

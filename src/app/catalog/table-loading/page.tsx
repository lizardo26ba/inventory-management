import { CatalogHeader, Specimen, requireEntry } from '../specimen';
import { ReloadingTable } from './reloading-table';

export default function TableLoadingCatalogPage(): React.ReactElement {
  const entry = requireEntry('table-loading');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Recarga de una tabla que ya se ve"
        description="No se vacía: las filas se atenúan y una barra recorre el borde de la cabecera. Se apaga cuando termina la última fuente, no la primera."
        usage={`<TableLoadingProvider>\n  <TableToolbar>… <TableProgress /></TableToolbar>\n  <TableBody>…</TableBody>\n</TableLoadingProvider>\n\nuseLoadingSource('search', isPending);`}
      >
        <ReloadingTable />
      </Specimen>
    </>
  );
}

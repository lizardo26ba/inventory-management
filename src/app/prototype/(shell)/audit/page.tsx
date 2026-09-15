import { Suspense } from 'react';

import { ListPageSkeleton } from '../../ui/skeleton';
import { TableLoadingProvider } from '../../ui/table-loading';
import { AuditView } from './audit-view';

/**
 * La pantalla lee la dirección para saber qué filtrar, cómo ordenar y qué
 * página mostrar, así que necesita una frontera de suspensión por encima. El
 * hueco lo ocupa el esqueleto de la lista.
 *
 * El proveedor de carga envuelve la vista para que los filtros y la consulta
 * puedan encender la barra de la cabecera de la tabla.
 */
export default function AuditPage(): React.ReactElement {
  return (
    <Suspense fallback={<ListPageSkeleton columns={5} summaryCards={4} />}>
      <TableLoadingProvider>
        <AuditView />
      </TableLoadingProvider>
    </Suspense>
  );
}

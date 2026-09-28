import { Suspense } from 'react';

import { ListPageSkeleton } from '../../ui/skeleton';
import { TableLoadingProvider } from '../../ui/table-loading';
import { WarehousesView } from './warehouses-view';

/**
 * La vista lee la dirección para saber qué buscar y cómo ordenar, así que
 * necesita una frontera de suspensión por encima. El hueco lo ocupa el
 * esqueleto de la lista.
 */
export default function WarehousesPage(): React.ReactElement {
  return (
    <Suspense fallback={<ListPageSkeleton columns={6} summaryCards={0} />}>
      <TableLoadingProvider>
        <WarehousesView />
      </TableLoadingProvider>
    </Suspense>
  );
}

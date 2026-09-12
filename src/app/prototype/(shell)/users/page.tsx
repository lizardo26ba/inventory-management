import { Suspense } from 'react';

import { ListPageSkeleton } from '../../ui/skeleton';
import { TableLoadingProvider } from '../../ui/table-loading';
import { UsersView } from './users-view';

/**
 * La pantalla lee la dirección para saber qué buscar, cómo ordenar y qué página
 * mostrar, así que necesita una frontera de suspensión por encima. El hueco de
 * esa frontera es el esqueleto de la lista, no un vacío: así lo que aparece
 * primero ya tiene la forma de lo que va a llegar.
 *
 * El proveedor de carga envuelve la vista para que el buscador y la consulta
 * puedan encender la barra de la cabecera de la tabla.
 */
export default function UsersPage(): React.ReactElement {
  return (
    <Suspense fallback={<ListPageSkeleton columns={6} />}>
      <TableLoadingProvider>
        <UsersView />
      </TableLoadingProvider>
    </Suspense>
  );
}

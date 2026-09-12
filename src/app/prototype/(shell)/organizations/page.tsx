import { Suspense } from 'react';

import { ListPageSkeleton } from '../../ui/skeleton';
import { TableLoadingProvider } from '../../ui/table-loading';
import { CompaniesView } from './companies-view';

/**
 * La pantalla lee la dirección para saber qué buscar y qué página mostrar, así
 * que necesita una frontera de suspensión por encima. Sin ella, Next no puede
 * preparar nada de la página hasta conocer los parámetros. El hueco lo ocupa el
 * esqueleto de la lista.
 *
 * El proveedor de carga envuelve la vista para que el buscador y la consulta
 * puedan encender la barra de la cabecera de la tabla.
 */
export default function OrganizationsPage(): React.ReactElement {
  return (
    <Suspense fallback={<ListPageSkeleton columns={7} />}>
      <TableLoadingProvider>
        <CompaniesView />
      </TableLoadingProvider>
    </Suspense>
  );
}

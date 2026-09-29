import { companyScopeOf } from '@/modules/auth/scope';
import { holdsCompanyPermission, requireCompanyPermission } from '@/modules/auth/session';
import { WarehousesView } from '@/modules/warehouses/components/warehouses-view';
import { listWarehouses } from '@/modules/warehouses/repository';
import { parseWarehouseListQuery } from '@/modules/warehouses/schema';

/**
 * Lista de almacenes de la empresa activa.
 *
 * Pide el permiso antes de leer nada: sin él, la consulta no llega a la base y
 * la pantalla de error explica que no se puede abrir esta sección.
 *
 * Qué se ofrece encima de la lista (alta, edición, archivar) se decide aquí,
 * con la misma comprobación que luego rechaza la acción.
 */
export default async function WarehousesPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  const session = await requireCompanyPermission('warehouse:read');
  const scope = companyScopeOf(session);

  const query = parseWarehouseListQuery(await searchParams);
  const { items, total } = await listWarehouses(scope, query);

  return (
    <WarehousesView
      items={items}
      total={total}
      query={query}
      permissions={{
        canCreate: holdsCompanyPermission(session, 'warehouse:create'),
        canUpdate: holdsCompanyPermission(session, 'warehouse:update'),
        canArchive: holdsCompanyPermission(session, 'warehouse:archive'),
      }}
    />
  );
}

import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/ui/page-header';
import { getCopy } from '@/lib/i18n/server';
import { companyScopeOf } from '@/modules/auth/scope';
import { requireCompanyPermission } from '@/modules/auth/session';
import { WarehouseForm } from '@/modules/warehouses/components/warehouse-form';
import {
  findWarehouseByCode,
  listWarehouseCountryOptions,
} from '@/modules/warehouses/repository';
import { WAREHOUSES_PATH } from '@/modules/warehouses/routes';

/**
 * Edición de almacén.
 *
 * Pide el permiso de editar, no el de ver: quien solo puede mirar la lista no
 * debe poder abrir esta pantalla, ni siquiera para encontrarse el rechazo al
 * guardar.
 *
 * El almacén se busca por su código dentro de la empresa activa. Uno de otra
 * empresa no se encuentra, y la respuesta es la misma que para uno que no
 * existe: distinguirlas delataría qué códigos usan las demás.
 */
export default async function EditWarehousePage({
  params,
}: {
  readonly params: Promise<{ readonly code: string }>;
}): Promise<React.ReactElement> {
  const session = await requireCompanyPermission('warehouse:update');
  const scope = companyScopeOf(session);

  const { code } = await params;
  const warehouse = await findWarehouseByCode(scope, decodeURIComponent(code));

  if (warehouse === null) notFound();

  const [copy, countries] = await Promise.all([getCopy(), listWarehouseCountryOptions(scope)]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        back={{ href: WAREHOUSES_PATH, label: copy.warehouseForm.back }}
        title={copy.warehouseForm.editTitle}
        subtitle={copy.warehouseForm.editSubtitle}
      />

      <WarehouseForm
        countries={countries}
        defaultCountryCode={warehouse.countryCode}
        warehouse={{
          id: warehouse.id,
          version: warehouse.version,
          values: {
            code: warehouse.code,
            name: warehouse.name,
            address: warehouse.address ?? '',
            countryCode: warehouse.countryCode,
            timeZone: warehouse.timeZone,
          },
        }}
      />
    </div>
  );
}

'use client';

import { useCopy } from '@/lib/i18n';
import { useCompanyPermissions } from '../../../company-permissions';
import { PageHeader } from '../../../ui/page-header';
import { WarehouseNoAccess } from '../no-access';
import { WAREHOUSES_PATH } from '../paths';
import { WarehouseForm } from '../warehouse-form';

/**
 * Alta de almacén. Quien llega aquí sin permiso de alta, por ejemplo con la
 * dirección escrita a mano, ve el aviso en lugar de un formulario que luego se
 * negaría a guardar.
 */
export default function NewWarehousePage(): React.ReactElement {
  const copy = useCopy();
  const permissions = useCompanyPermissions();

  if (!permissions.has('warehouse.create')) return <WarehouseNoAccess />;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        back={{ href: WAREHOUSES_PATH, label: copy.warehouseForm.back }}
        title={copy.warehouseForm.title}
        subtitle={copy.warehouseForm.subtitle}
      />

      <WarehouseForm />
    </div>
  );
}

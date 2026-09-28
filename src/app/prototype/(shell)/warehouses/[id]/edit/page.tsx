'use client';

/**
 * Edición de almacén.
 *
 * Es de cliente porque lee el almacén en memoria de la maqueta. En la
 * aplicación real el almacén lo trae el servidor por su identificador, dentro
 * de la empresa activa: uno de otra empresa no se encuentra, igual que aquí.
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { useCopy } from '@/lib/i18n';
import { useCompanyPermissions } from '../../../../company-permissions';
import { EMPTY_STATE_LINK_CLASS, EmptyState } from '../../../../ui/empty-state';
import { PageHeader } from '../../../../ui/page-header';
import { useWarehouseStore } from '../../../../warehouse-store';
import { WarehouseNoAccess } from '../../no-access';
import { WAREHOUSES_PATH } from '../../paths';
import { WarehouseForm } from '../../warehouse-form';

export default function EditWarehousePage(): React.ReactElement {
  const copy = useCopy();
  const permissions = useCompanyPermissions();
  const params = useParams<{ id: string }>();
  const { findById } = useWarehouseStore();

  if (!permissions.has('warehouse.update')) return <WarehouseNoAccess />;

  const warehouse = findById(params.id);
  if (warehouse === undefined) {
    return (
      <EmptyState message={copy.warehouseForm.notFound}>
        <Link href={WAREHOUSES_PATH as never} className={EMPTY_STATE_LINK_CLASS}>
          {copy.warehouseForm.back}
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        back={{ href: WAREHOUSES_PATH, label: copy.warehouseForm.back }}
        title={copy.warehouseForm.editTitle}
        subtitle={copy.warehouseForm.editSubtitle}
      />

      <WarehouseForm
        warehouseId={warehouse.id}
        initialValues={{
          code: warehouse.code,
          name: warehouse.name,
          address: warehouse.address ?? '',
          countryCode: warehouse.countryCode,
          timeZone: warehouse.timeZone,
        }}
      />
    </div>
  );
}

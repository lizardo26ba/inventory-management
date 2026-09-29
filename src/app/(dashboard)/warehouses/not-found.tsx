import Link from 'next/link';

import { EMPTY_STATE_LINK_CLASS, EmptyState } from '@/components/ui/empty-state';
import { getCopy } from '@/lib/i18n/server';
import { WAREHOUSES_PATH } from '@/modules/warehouses/routes';

/**
 * Lo que se ve cuando el almacén de la dirección no existe en la empresa activa.
 *
 * No distingue entre uno que nunca existió y uno de otra empresa. Distinguirlos
 * delataría qué códigos usan las demás.
 */
export default async function WarehouseNotFound(): Promise<React.ReactElement> {
  const copy = await getCopy();

  return (
    <EmptyState message={copy.warehouseForm.notFound}>
      <Link href={WAREHOUSES_PATH} className={EMPTY_STATE_LINK_CLASS}>
        {copy.warehouseForm.back}
      </Link>
    </EmptyState>
  );
}

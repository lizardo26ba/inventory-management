import { PageHeader } from '@/components/ui/page-header';
import { getCopy } from '@/lib/i18n/server';
import { findCompanySummary } from '@/modules/auth/repository';
import { companyScopeOf } from '@/modules/auth/scope';
import { requireCompanyPermission } from '@/modules/auth/session';
import { WarehouseForm } from '@/modules/warehouses/components/warehouse-form';
import { listWarehouseCountryOptions } from '@/modules/warehouses/repository';
import { WAREHOUSES_PATH } from '@/modules/warehouses/routes';

/**
 * Alta de almacén.
 *
 * Pide el permiso de crear antes de leer nada. Los países y sus zonas salen del
 * catálogo de la base, y se propone el de la empresa, que es el caso más común.
 */
export default async function NewWarehousePage(): Promise<React.ReactElement> {
  const session = await requireCompanyPermission('warehouse:create');
  const scope = companyScopeOf(session);

  const [copy, countries, company] = await Promise.all([
    getCopy(),
    listWarehouseCountryOptions(scope),
    findCompanySummary(session.organizationId),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        back={{ href: WAREHOUSES_PATH, label: copy.warehouseForm.back }}
        title={copy.warehouseForm.title}
        subtitle={copy.warehouseForm.subtitle}
      />

      <WarehouseForm countries={countries} defaultCountryCode={company?.countryCode ?? ''} />
    </div>
  );
}

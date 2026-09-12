import { PageHeader } from '@/components/ui/page-header';
import { getCopy } from '@/lib/i18n/server';
import { requirePlatformPermission } from '@/modules/auth/session';
import { OrganizationForm } from '@/modules/organizations/components/organization-form';
import {
  listCountryOptions,
  listCurrencyOptions,
  listTakenSlugs,
} from '@/modules/organizations/repository';
import { ORGANIZATIONS_PATH } from '@/modules/organizations/routes';

/**
 * Alta de empresa.
 *
 * Pide el permiso antes de leer nada, igual que la lista. Los países y monedas
 * salen del catálogo de la base y no de una lista escrita en el código: añadir
 * un país es sembrar una fila, no desplegar.
 */
export default async function NewOrganizationPage(): Promise<React.ReactElement> {
  await requirePlatformPermission('platform.organization:create');

  const [copy, countries, currencies, takenSlugs] = await Promise.all([
    getCopy(),
    listCountryOptions(),
    listCurrencyOptions(),
    // Los códigos ya usados viajan al formulario para que enseñe el que se va a
    // asignar. El definitivo lo calcula el servidor al escribir la fila.
    listTakenSlugs(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        back={{ href: ORGANIZATIONS_PATH, label: copy.organizationForm.back }}
        title={copy.organizationForm.title}
        subtitle={copy.organizationForm.subtitle}
      />

      <OrganizationForm countries={countries} currencies={currencies} takenSlugs={takenSlugs} />
    </div>
  );
}

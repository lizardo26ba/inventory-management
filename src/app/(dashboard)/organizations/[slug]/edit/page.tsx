import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/ui/page-header';
import { getCopy } from '@/lib/i18n/server';
import { requirePlatformPermission } from '@/modules/auth/session';
import { OrganizationForm } from '@/modules/organizations/components/organization-form';
import {
  findOrganizationBySlug,
  listCountryOptions,
  listCurrencyOptions,
} from '@/modules/organizations/repository';
import { ORGANIZATIONS_PATH } from '@/modules/organizations/routes';

/**
 * Edición de empresa.
 *
 * Pide el permiso de editar, no el de ver: quien solo puede mirar la lista no
 * debe poder abrir esta pantalla, ni siquiera para encontrarse el rechazo al
 * guardar.
 *
 * El teléfono guardado lleva el prefijo del país delante. Se separa aquí para
 * que el formulario reciba solo la parte que se escribe, porque el prefijo lo
 * pone el país y no es un dato que nadie teclee.
 */
export default async function EditOrganizationPage({
  params,
}: {
  readonly params: Promise<{ readonly slug: string }>;
}): Promise<React.ReactElement> {
  await requirePlatformPermission('platform.organization:update');

  const { slug } = await params;
  const organization = await findOrganizationBySlug(slug);

  if (organization === null) notFound();

  const [copy, countries, currencies] = await Promise.all([
    getCopy(),
    listCountryOptions(),
    listCurrencyOptions(),
  ]);

  const prefix =
    countries.find((candidate) => candidate.code === organization.countryCode)?.phonePrefix ??
    '';
  const storedPhone = organization.phone ?? '';
  const phoneNumber = storedPhone.startsWith(prefix)
    ? storedPhone.slice(prefix.length).trim()
    : storedPhone;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        back={{ href: ORGANIZATIONS_PATH, label: copy.organizationForm.back }}
        title={copy.organizationForm.editTitle}
        subtitle={copy.organizationForm.editSubtitle}
      />

      <OrganizationForm
        countries={countries}
        currencies={currencies}
        organization={{
          id: organization.id,
          slug: organization.slug,
          version: organization.version,
          values: {
            name: organization.name,
            legalName: organization.legalName,
            countryCode: organization.countryCode,
            baseCurrencyCode: organization.baseCurrencyCode,
            taxId: organization.taxId ?? '',
            email: organization.email ?? '',
            phoneNumber,
            address: organization.address ?? '',
          },
        }}
      />
    </div>
  );
}

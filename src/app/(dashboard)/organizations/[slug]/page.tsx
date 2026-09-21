import Link from 'next/link';
import { notFound } from 'next/navigation';

import { buttonClass } from '@/components/ui/button';
import { DefinitionList, DefinitionRow } from '@/components/ui/definition-list';
import { CountryFlag } from '@/components/ui/flag';
import { IconPencil } from '@/components/ui/icons';
import { PageHeader } from '@/components/ui/page-header';
import { formatDate, formatQuantity } from '@/lib/format';
import { getCopy } from '@/lib/i18n/server';
import { scopeOf } from '@/modules/auth/scope';
import { requirePlatformPermission } from '@/modules/auth/session';
import { findOrganizationBySlug } from '@/modules/organizations/repository';
import { ORGANIZATIONS_PATH, organizationPath } from '@/modules/organizations/routes';

/**
 * Ficha de una empresa, solo lectura.
 *
 * Los datos van en una lista de definiciones y no en una tabla: no son filas
 * comparables entre sí, son pares de etiqueta y valor. Un lector de pantalla los
 * anuncia emparejados, que es como se leen.
 *
 * La dirección lleva el código de la empresa y no su identificador interno. Es
 * corto, se reconoce y se puede leer en voz alta.
 */

const EMPTY_VALUE = '—';

export default async function OrganizationDetailPage({
  params,
}: {
  readonly params: Promise<{ readonly slug: string }>;
}): Promise<React.ReactElement> {
  const session = await requirePlatformPermission('platform.organization:read');

  const { slug } = await params;
  const organization = await findOrganizationBySlug(scopeOf(session), slug);

  // Una empresa borrada no existe para nadie. Da la misma respuesta que una que
  // nunca existió, para no delatar cuáles hubo.
  if (organization === null) notFound();

  const copy = await getCopy();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        back={{ href: ORGANIZATIONS_PATH, label: copy.organizationForm.back }}
        title={organization.name}
        subtitle={organization.legalName}
      >
        <Link
          href={`${organizationPath(organization.slug)}/edit`}
          className={buttonClass({ variant: 'secondary', size: 'sm' })}
        >
          <IconPencil className="h-4 w-4" />
          {copy.organizations.edit}
        </Link>
      </PageHeader>

      <DefinitionList>
        <DefinitionRow label={copy.organizations.columnCode}>
          <span className="font-mono text-xs uppercase">{organization.slug}</span>
        </DefinitionRow>
        <DefinitionRow label={copy.organizations.columnCountry}>
          <span className="flex items-center gap-2">
            <CountryFlag countryCode={organization.countryCode} className="h-4 w-4" />
            {organization.countryName}
          </span>
        </DefinitionRow>
        <DefinitionRow label={copy.organizations.columnCurrency}>
          {organization.baseCurrencyCode}
        </DefinitionRow>
        <DefinitionRow label={copy.organizationForm.taxId}>
          {organization.taxId ?? EMPTY_VALUE}
        </DefinitionRow>
        <DefinitionRow label={copy.organizationForm.email}>
          {organization.email ?? EMPTY_VALUE}
        </DefinitionRow>
        <DefinitionRow label={copy.organizationForm.phone}>
          {organization.phone ?? EMPTY_VALUE}
        </DefinitionRow>
        <DefinitionRow label={copy.organizationForm.address}>
          {organization.address ?? EMPTY_VALUE}
        </DefinitionRow>
        <DefinitionRow label={copy.organizations.columnUsers}>
          {formatQuantity(organization.userCount)}
        </DefinitionRow>
        <DefinitionRow label={copy.organizations.columnWarehouses}>
          {formatQuantity(organization.warehouseCount)}
        </DefinitionRow>
        <DefinitionRow label={copy.organizations.columnCreatedAt}>
          {formatDate(organization.createdAt.toISOString())}
        </DefinitionRow>
        <DefinitionRow label={copy.organizations.columnStatus}>
          <span className={organization.isActive ? 'text-success' : 'text-text-muted'}>
            {organization.isActive ? copy.status.active : copy.status.inactive}
          </span>
        </DefinitionRow>
      </DefinitionList>
    </div>
  );
}

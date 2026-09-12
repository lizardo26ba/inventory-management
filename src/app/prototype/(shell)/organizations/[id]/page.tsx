'use client';

/**
 * Detalle de una empresa, solo lectura.
 *
 * Los datos van en una lista de definiciones y no en una tabla: no son filas
 * comparables entre sí, son pares de etiqueta y valor. Un lector de pantalla
 * los anuncia emparejados, que es como se leen.
 */

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { useCompanyStore } from '../../../company-store';
import { useCopy } from '@/lib/i18n';
import { buttonClass } from '../../../ui/button';
import { DefinitionList, DefinitionRow } from '../../../ui/definition-list';
import { EMPTY_STATE_LINK_CLASS, EmptyState } from '../../../ui/empty-state';
import { CountryFlag } from '../../../ui/flag';
import { formatDate, formatQuantity } from '@/lib/format';
import { IconPencil } from '../../../ui/icons';
import { PageHeader } from '../../../ui/page-header';

const EMPTY_VALUE = '—';

const COMPANIES_PATH = '/prototype/organizations';

export default function OrganizationDetailPage(): React.ReactElement {
  const copy = useCopy();

  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { findById, enterCompany } = useCompanyStore();
  const company = findById(params.id);

  if (company === undefined) {
    return (
      <EmptyState message={copy.organizationForm.notFound}>
        <Link href={COMPANIES_PATH as never} className={EMPTY_STATE_LINK_CLASS}>
          {copy.organizationForm.back}
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        back={{ href: COMPANIES_PATH, label: copy.organizationForm.back }}
        title={company.name}
        subtitle={company.legalName}
      >
        <div className="flex gap-2">
          <Link
            href={`/prototype/organizations/${company.id}/edit` as never}
            className={buttonClass({ variant: 'secondary', size: 'sm' })}
          >
            <IconPencil className="h-4 w-4" />
            {copy.organizations.edit}
          </Link>

          {/* Entrar cambia el contexto: a partir de aquí la operación existe y
              todo lo que se ve pertenece a esta empresa. */}
          <button
            type="button"
            onClick={() => {
              enterCompany(company.id);
              router.push('/prototype' as never);
            }}
            className={buttonClass({ size: 'sm' })}
          >
            {copy.admin.enterCompany}
          </button>
        </div>
      </PageHeader>

      <DefinitionList>
        <DefinitionRow label={copy.organizations.columnCode}>
          <span className="font-mono text-xs">{company.code}</span>
        </DefinitionRow>
        <DefinitionRow label={copy.organizations.columnCountry}>
          <span className="flex items-center gap-2">
            <CountryFlag countryCode={company.countryCode} className="h-4 w-4" />
            {company.countryName}
          </span>
        </DefinitionRow>
        <DefinitionRow label={copy.organizations.columnCurrency}>
          {company.currency}
        </DefinitionRow>
        <DefinitionRow label={copy.organizationForm.taxId}>
          {company.taxId ?? EMPTY_VALUE}
        </DefinitionRow>
        <DefinitionRow label={copy.organizationForm.email}>
          {company.email ?? EMPTY_VALUE}
        </DefinitionRow>
        <DefinitionRow label={copy.organizationForm.phone}>
          {company.phone ?? EMPTY_VALUE}
        </DefinitionRow>
        <DefinitionRow label={copy.organizationForm.address}>
          {company.address ?? EMPTY_VALUE}
        </DefinitionRow>
        <DefinitionRow label={copy.organizations.columnUsers}>
          {formatQuantity(company.userCount)}
        </DefinitionRow>
        <DefinitionRow label={copy.organizations.columnWarehouses}>
          {formatQuantity(company.warehouseCount)}
        </DefinitionRow>
        <DefinitionRow label={copy.organizations.columnCreatedAt}>
          {formatDate(company.createdAt)}
        </DefinitionRow>
        <DefinitionRow label={copy.organizations.columnCreatedBy}>
          {company.createdByEmail}
        </DefinitionRow>
        <DefinitionRow label={copy.organizations.columnStatus}>
          {company.active ? copy.status.active : copy.status.inactive}
        </DefinitionRow>
      </DefinitionList>
    </div>
  );
}

'use client';

/**
 * Edición de empresa.
 *
 * Es de cliente porque lee el almacén en memoria del prototipo. En la
 * aplicación real la empresa la trae el servidor por su identificador y esta
 * pantalla vuelve a ser de servidor.
 *
 * El teléfono guardado llega con prefijo. Se separa aquí para que el formulario
 * reciba solo la parte que se escribe: el prefijo lo pone el país.
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { useCompanyStore } from '../../../../company-store';
import { useCopy } from '@/lib/i18n';
import { EMPTY_STATE_LINK_CLASS, EmptyState } from '../../../../ui/empty-state';
import { findCountry } from '../../../../fake-data';
import { PageHeader } from '../../../../ui/page-header';
import { CompanyForm } from '../../company-form';

const COMPANIES_PATH = '/prototype/organizations';

export default function EditOrganizationPage(): React.ReactElement {
  const copy = useCopy();

  const params = useParams<{ id: string }>();
  const { findById } = useCompanyStore();
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

  const prefix = findCountry(company.countryCode)?.phonePrefix ?? '';
  const phoneNumber =
    company.phone !== undefined && company.phone.startsWith(prefix)
      ? company.phone.slice(prefix.length).trim()
      : (company.phone ?? '');

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        back={{ href: COMPANIES_PATH, label: copy.organizationForm.back }}
        title={copy.organizationForm.editTitle}
        subtitle={copy.organizationForm.editSubtitle}
      />

      <CompanyForm
        companyId={company.id}
        assignedCode={company.code}
        initialValues={{
          name: company.name,
          legalName: company.legalName,
          countryCode: company.countryCode,
          currency: company.currency,
          taxId: company.taxId ?? '',
          phoneNumber,
          email: company.email ?? '',
          address: company.address ?? '',
        }}
      />
    </div>
  );
}

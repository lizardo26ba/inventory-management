'use client';

import { useCopy } from '@/lib/i18n';
import { PageHeader } from '../../../ui/page-header';
import { CompanyForm } from '../company-form';

/** Alta de empresa. La pantalla solo compone: el formulario vive aparte porque
 *  lo comparte con la edición. */
export default function NewOrganizationPage(): React.ReactElement {
  const copy = useCopy();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        back={{ href: '/prototype/organizations', label: copy.organizationForm.back }}
        title={copy.organizationForm.title}
        subtitle={copy.organizationForm.subtitle}
      />

      <CompanyForm />
    </div>
  );
}

import { PageHeader } from '@/components/ui/page-header';
import { getCopy } from '@/lib/i18n/server';
import { requirePlatformPermission } from '@/modules/auth';
import { UserForm } from '@/modules/users/components/user-form';
import { listCountryChoices, listOrganizationChoices } from '@/modules/users/repository';
import { USERS_PATH } from '@/modules/users/routes';

/**
 * Alta de usuario.
 *
 * Los países y las empresas con sus roles salen de la base, no de una lista
 * escrita en el código: añadir un país es sembrar una fila, y una empresa nueva
 * aparece aquí sin desplegar nada.
 */
export default async function NewUserPage(): Promise<React.ReactElement> {
  await requirePlatformPermission('platform.user:create');

  const [copy, countries, organizations] = await Promise.all([
    getCopy(),
    listCountryChoices(),
    listOrganizationChoices(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        back={{ href: USERS_PATH, label: copy.userForm.back }}
        title={copy.userForm.title}
        subtitle={copy.userForm.subtitle}
      />

      <UserForm countries={countries} organizations={organizations} />
    </div>
  );
}

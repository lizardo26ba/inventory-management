import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/ui/page-header';
import { getCopy } from '@/lib/i18n/server';
import { requirePlatformPermission } from '@/modules/auth';
import { UserForm } from '@/modules/users/components/user-form';
import {
  findUserById,
  listCountryChoices,
  listOrganizationChoices,
} from '@/modules/users/repository';
import { USERS_PATH } from '@/modules/users/routes';

/**
 * Edición de usuario.
 *
 * Pide el permiso de editar, no el de ver: quien solo puede mirar la lista no
 * debe poder abrir esta pantalla, ni siquiera para encontrarse el rechazo al
 * guardar.
 *
 * La versión de la cuenta viaja al formulario. Si otra persona guarda mientras
 * esta pantalla está abierta, el servidor rechaza en lugar de pisar su trabajo.
 */
export default async function EditUserPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}): Promise<React.ReactElement> {
  await requirePlatformPermission('platform.user:update');

  const { id } = await params;
  const user = await findUserById(id);

  // Una cuenta borrada no existe para nadie. Da la misma respuesta que una que
  // nunca existió.
  if (user === null) notFound();

  const [copy, countries, organizations] = await Promise.all([
    getCopy(),
    listCountryChoices(),
    listOrganizationChoices(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        back={{ href: USERS_PATH, label: copy.userForm.back }}
        title={copy.userForm.editTitle}
        subtitle={copy.userForm.editSubtitle}
      />

      <UserForm
        countries={countries}
        organizations={organizations}
        user={{
          id: user.id,
          version: user.version,
          values: {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            countryCode: user.countryCode ?? countries[0]?.code ?? '',
            accesses: user.accesses.map((access) => ({
              organizationId: access.organizationId,
              roleId: access.roleId,
            })),
          },
        }}
      />
    </div>
  );
}

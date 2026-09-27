import { redirect } from 'next/navigation';

import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { resolveLanding } from '@/modules/auth/landing';
import { listCompanyChoices } from '@/modules/auth/repository';
import { CHANGE_PASSWORD_PATH, SIGN_IN_PATH, SIGNED_IN_PATH } from '@/modules/auth/routes';
import { getSession } from '@/modules/auth/session';

import { CompanyPicker } from './company-picker';
import { CompanyPickerHeading, PickerSignOut } from './company-picker-heading';

/**
 * Elegir en qué empresa trabajar. RN-001, ADR 0013.
 *
 * Queda fuera del marco, igual que el cambio de contraseña: sin empresa elegida
 * no hay operación que ofrecer en un menú.
 *
 * Solo la ve quien tiene que elegir. Lo decide la misma función que manda a cada
 * persona a su sitio al entrar, así que la plataforma, que empieza en su lista de
 * empresas, no llega aquí ni escribiendo la dirección.
 *
 * Quien ya está dentro de una empresa y tiene otras sí puede volver: es el camino
 * para cambiar de una a otra.
 */
export default async function SelectCompanyPage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) redirect(SIGN_IN_PATH);
  if (session.mustChangePassword) redirect(CHANGE_PASSWORD_PATH);

  const landing = resolveLanding({ ...session, organizationId: null });
  if (landing.kind !== 'chooseCompany') redirect(SIGNED_IN_PATH);

  const choices = await listCompanyChoices(session.userId);

  return (
    <div className="min-h-dvh">
      <div className="flex justify-end p-3">
        <LanguageSwitcher />
      </div>

      <main className="mx-auto w-full max-w-md px-4 pt-6 pb-10 sm:pt-16">
        <CompanyPickerHeading
          name={`${session.firstName} ${session.lastName}`}
          hasChoices={choices.length > 0}
        />

        {choices.length > 0 ? (
          <div className="mt-6">
            <CompanyPicker
              choices={choices.map((choice) => ({
                organizationId: choice.organizationId,
                name: choice.name,
                countryCode: choice.countryCode,
                countryName: choice.countryName,
                currencyCode: choice.baseCurrencyCode,
                roles: choice.roles,
              }))}
            />
          </div>
        ) : null}

        <PickerSignOut />
      </main>
    </div>
  );
}

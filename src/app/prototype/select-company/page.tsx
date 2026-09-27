'use client';

/**
 * Elegir en qué empresa trabajar.
 *
 * Solo llega aquí quien pertenece a dos o más empresas: con una sola no hay nada
 * que elegir y se entra directo, y la plataforma empieza en su lista de
 * empresas. RN-001.
 *
 * Queda fuera del marco de la aplicación, igual que el acceso: sin empresa
 * elegida no hay operación que ofrecer en un menú.
 *
 * Cada opción enseña el rol que la persona tiene en esa empresa, porque es lo
 * que cambia de una a otra: la misma persona puede administrar una y solo
 * consultar otra.
 *
 * En la aplicación real, elegir es una Server Action que comprueba que la
 * membresía sigue viva, rota la sesión y lleva a la portada de la empresa.
 */

import { useRouter } from 'next/navigation';

import { useCopy } from '@/lib/i18n';
import { companies } from '../fake-data';
import { useSessionStore } from '../session-store';
import { findRole } from '../users-data';
import { ChoiceList, type Choice } from '../ui/choice-list';
import { EmptyState } from '../ui/empty-state';
import { CountryFlag } from '../ui/flag';
import { LanguageSwitcher } from '../ui/language-switcher';
import { Tag } from '../ui/tag';

const COMPANY_HOME = '/prototype';
const LOGIN_PATH = '/prototype/login';

export default function SelectCompanyPage(): React.ReactElement {
  const copy = useCopy();
  const router = useRouter();
  const { account, enterCompany, signOut } = useSessionStore();

  const choices: readonly Choice[] = account.memberships.flatMap((membership) => {
    const company = companies.find((candidate) => candidate.id === membership.companyId);
    if (company === undefined) return [];

    return [
      {
        key: company.id,
        title: company.name,
        description: `${company.countryName} · ${company.currency}`,
        leading: <CountryFlag countryCode={company.countryCode} className="h-8 w-8 shrink-0" />,
        meta: (
          <span>
            <span className="sr-only">{copy.companyPicker.yourRole}: </span>
            <Tag>{findRole(membership.roleCode)?.name ?? membership.roleCode}</Tag>
          </span>
        ),
        onSelect: () => {
          enterCompany(company.id);
          router.push(COMPANY_HOME as never);
        },
      },
    ];
  });

  return (
    <div className="min-h-dvh">
      <div className="flex justify-end p-3">
        <LanguageSwitcher />
      </div>

      <main className="mx-auto w-full max-w-md px-4 pt-6 pb-10 sm:pt-16">
        <p className="text-text-muted text-sm">
          {copy.admin.signedInAs} {account.name}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {copy.companyPicker.title}
        </h1>

        {choices.length === 0 ? (
          <div className="mt-6">
            <EmptyState message={copy.companyPicker.noCompanies} />
          </div>
        ) : (
          <>
            <p className="text-text-muted mt-1 text-sm">{copy.companyPicker.subtitle}</p>
            <div className="mt-6">
              <ChoiceList label={copy.companyPicker.title} choices={choices} />
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => {
            signOut();
            router.push(LOGIN_PATH as never);
          }}
          className="text-text-muted hover:text-text mt-6 text-sm underline-offset-4 hover:underline"
        >
          {copy.admin.signOut}
        </button>
      </main>
    </div>
  );
}

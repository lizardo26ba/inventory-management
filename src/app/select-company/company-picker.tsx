'use client';

/**
 * La lista de empresas entre las que elegir.
 *
 * Es de cliente porque reacciona al clic. Las empresas llegan ya leídas del
 * servidor, y elegir una es la acción `enterCompany`, que comprueba otra vez que
 * la membresía sigue viva: lo que se dibujó hace un momento puede haber cambiado.
 *
 * Mientras entra, la lista entera queda deshabilitada. Un segundo clic en otra
 * empresa mientras la primera todavía rota la sesión dejaría a la persona sin
 * saber en cuál acabó.
 */

import { useState, useTransition } from 'react';

import { ChoiceList, type Choice } from '@/components/ui/choice-list';
import { CountryFlag } from '@/components/ui/flag';
import { FormAlert } from '@/components/ui/form-alert';
import { Tag } from '@/components/ui/tag';
import { useCopy } from '@/lib/i18n';
import { errorReason } from '@/lib/i18n/error-reason';
import { enterCompany } from '@/modules/auth/actions';
import { roleName } from '@/modules/users/components/role-name';

export type PickerChoice = {
  readonly organizationId: string;
  readonly name: string;
  readonly countryCode: string;
  readonly countryName: string;
  readonly currencyCode: string;
  readonly roles: readonly { readonly code: string | null; readonly name: string }[];
};

export function CompanyPicker({
  choices,
}: {
  readonly choices: readonly PickerChoice[];
}): React.ReactElement {
  const copy = useCopy();
  const [isEntering, startEntering] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function enter(organizationId: string): void {
    setError(null);
    startEntering(async () => {
      // Si entra, la acción redirige a la portada y esto no vuelve. Si vuelve, es
      // que el servidor dijo que no.
      const result = await enterCompany({ organizationId });
      if (!result.ok) setError(errorReason(copy, result.error.code));
    });
  }

  const items: readonly Choice[] = choices.map((choice) => ({
    key: choice.organizationId,
    title: choice.name,
    description: `${choice.countryName} · ${choice.currencyCode}`,
    leading: <CountryFlag countryCode={choice.countryCode} className="h-8 w-8 shrink-0" />,
    meta:
      choice.roles.length > 0 ? (
        <span>
          <span className="sr-only">{copy.companyPicker.yourRole}: </span>
          <Tag>{choice.roles.map((role) => roleName(role, copy)).join(', ')}</Tag>
        </span>
      ) : undefined,
    onSelect: () => enter(choice.organizationId),
  }));

  return (
    <div className="space-y-4">
      {error !== null ? <FormAlert>{error}</FormAlert> : null}

      {/* Deshabilitar el conjunto desactiva todos sus botones de una vez, sin que
          la lista tenga que saber nada de esperas. */}
      <fieldset disabled={isEntering} aria-busy={isEntering} className="min-w-0">
        <legend className="sr-only">{copy.companyPicker.title}</legend>
        <ChoiceList label={copy.companyPicker.title} choices={items} />
      </fieldset>
    </div>
  );
}

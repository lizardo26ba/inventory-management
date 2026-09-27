'use client';

/**
 * Entrar en la empresa de esta ficha, como plataforma. RN-004, ADR 0005.
 *
 * La elección es explícita: se entra desde la ficha de la empresa, viendo cuál
 * es, y no desde un atajo. La acción vuelve a comprobarlo todo en el servidor, y
 * si entra, redirige a la portada de la empresa, con la barra que avisa del
 * acceso elevado.
 */

import { useState, useTransition } from 'react';

import { buttonClass } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/form-alert';
import { useCopy } from '@/lib/i18n';
import { errorReason } from '@/lib/i18n/error-reason';
import { enterCompany } from '@/modules/auth/actions';

export function EnterCompanyButton({
  organizationId,
}: {
  readonly organizationId: string;
}): React.ReactElement {
  const copy = useCopy();
  const [isEntering, startEntering] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function enter(): void {
    setError(null);
    startEntering(async () => {
      // Si entra, la acción redirige y esto no vuelve. Si vuelve, el servidor
      // dijo que no.
      const result = await enterCompany({ organizationId });
      if (!result.ok) setError(errorReason(copy, result.error.code));
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={enter}
        disabled={isEntering}
        aria-busy={isEntering}
        className={buttonClass({ size: 'sm' })}
      >
        {copy.admin.enterCompany}
      </button>
      {error !== null ? <FormAlert>{error}</FormAlert> : null}
    </div>
  );
}

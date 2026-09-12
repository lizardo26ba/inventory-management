'use client';

/**
 * Encabezado del cambio de contraseña.
 *
 * Es de cliente solo porque lee el idioma elegido. La decisión de si el cambio
 * es forzoso la toma el servidor y llega ya resuelta.
 */

import { Notice } from '@/components/ui/notice';
import { useCopy } from '@/lib/i18n';

export function ChangePasswordHeading({
  isForced,
  email,
}: {
  readonly isForced: boolean;
  readonly email: string;
}): React.ReactElement {
  const copy = useCopy();

  return (
    <header>
      <h1 className="text-2xl font-semibold tracking-tight">{copy.changePassword.title}</h1>
      <p className="text-text-muted mt-1 text-sm">{email}</p>
      {isForced ? (
        <div className="mt-4">
          <Notice>
            {copy.changePassword.subtitle} {copy.changePassword.forced}
          </Notice>
        </div>
      ) : null}
    </header>
  );
}

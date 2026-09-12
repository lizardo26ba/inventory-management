'use client';

/**
 * Quien entró bien pero no alcanza ninguna empresa.
 *
 * No es un error suyo ni un fallo del sistema: es una cuenta a la que todavía no
 * le han concedido acceso. Decirlo con todas las letras evita que la persona
 * crea que algo se rompió, y le dice a quién acudir.
 */

import { useCopy } from '@/lib/i18n';

export function NoAccessPanel({ email }: { readonly email: string }): React.ReactElement {
  const copy = useCopy();

  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-xl font-semibold tracking-tight">{copy.noAccess.title}</h1>
      <p className="text-text-muted mt-2 text-sm">{copy.noAccess.body}</p>
      <p className="text-text-muted mt-4 text-xs">{email}</p>
    </div>
  );
}

'use client';

/**
 * Encabezado y salida del selector de empresa.
 *
 * Son de cliente solo porque leen el idioma elegido. Qué hay que decir lo decide
 * el servidor y llega ya resuelto: si la persona tiene empresas entre las que
 * elegir o ninguna.
 */

import { useFormStatus } from 'react-dom';

import { EmptyState } from '@/components/ui/empty-state';
import { useCopy } from '@/lib/i18n';
import { signOut } from '@/modules/auth/actions';

export function CompanyPickerHeading({
  name,
  hasChoices,
}: {
  readonly name: string;
  readonly hasChoices: boolean;
}): React.ReactElement {
  const copy = useCopy();

  return (
    <header>
      <p className="text-text-muted text-sm">
        {copy.admin.signedInAs} {name}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{copy.companyPicker.title}</h1>

      {hasChoices ? (
        <p className="text-text-muted mt-1 text-sm">{copy.companyPicker.subtitle}</p>
      ) : (
        // Quien llega aquí sin ninguna empresa no se equivocó en nada: a su
        // cuenta todavía no le han dado acceso, y eso se le dice.
        <div className="mt-6">
          <EmptyState message={copy.companyPicker.noCompanies} />
        </div>
      )}
    </header>
  );
}

function SignOutButton(): React.ReactElement {
  const copy = useCopy();
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="text-text-muted hover:text-text text-sm underline-offset-4 hover:underline disabled:opacity-60"
    >
      {copy.admin.signOut}
    </button>
  );
}

export function PickerSignOut(): React.ReactElement {
  return (
    <form action={signOut} className="mt-6">
      <SignOutButton />
    </form>
  );
}

'use client';

/**
 * El marco de las pantallas del segundo factor.
 *
 * Quedan fuera del marco de la aplicación, igual que el cambio de contraseña y el
 * selector de empresa: quien no ha superado el segundo factor todavía no ha
 * entrado, y no hay menú que ofrecerle. Solo el idioma, quién es y la salida.
 *
 * Es de cliente porque lee el idioma elegido. Qué pantalla es lo decide el
 * servidor y llega ya resuelto.
 */

import { useFormStatus } from 'react-dom';

import { IconShield } from '@/components/ui/icons';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { useCopy } from '@/lib/i18n';
import { signOut } from '@/modules/auth/actions';

export type TwoFactorScreen = 'verify' | 'setup';

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

export function TwoFactorFrame({
  screen,
  name,
  children,
}: {
  readonly screen: TwoFactorScreen;
  readonly name: string;
  readonly children: React.ReactNode;
}): React.ReactElement {
  const copy = useCopy();
  const title = screen === 'verify' ? copy.twoFactor.verifyTitle : copy.twoFactor.setupTitle;
  const subtitle =
    screen === 'verify' ? copy.twoFactor.verifySubtitle : copy.twoFactor.setupSubtitle;

  return (
    <div className="min-h-dvh">
      <div className="flex justify-end p-3">
        <LanguageSwitcher />
      </div>

      <main className="mx-auto w-full max-w-md px-4 pt-6 pb-10 sm:pt-12">
        <section className="border-border bg-surface rounded-card border p-6">
          <IconShield className="text-primary h-8 w-8" />
          <p className="text-text-muted mt-4 text-sm">
            {copy.admin.signedInAs} {name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-text-muted mt-1 text-sm">{subtitle}</p>
          {children}
        </section>

        <form action={signOut} className="mt-6">
          <SignOutButton />
        </form>
      </main>
    </div>
  );
}

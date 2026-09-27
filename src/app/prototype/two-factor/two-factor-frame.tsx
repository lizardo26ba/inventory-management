'use client';

/**
 * El marco de las pantallas del segundo factor.
 *
 * Quedan fuera del marco de la aplicación, igual que el acceso y el selector de
 * empresa: quien no ha superado el segundo factor todavía no ha entrado, y no hay
 * menú que ofrecerle. Solo el idioma, quién es y la salida.
 */

import { useRouter } from 'next/navigation';

import { useCopy } from '@/lib/i18n';
import { useSessionStore } from '../session-store';
import { IconShield } from '../ui/icons';
import { LanguageSwitcher } from '../ui/language-switcher';

const LOGIN_PATH = '/prototype/login';

export function TwoFactorFrame({
  title,
  subtitle,
  children,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly children: React.ReactNode;
}): React.ReactElement {
  const copy = useCopy();
  const router = useRouter();
  const { account, signOut } = useSessionStore();

  return (
    <div className="min-h-dvh">
      <div className="flex justify-end p-3">
        <LanguageSwitcher />
      </div>

      <main className="mx-auto w-full max-w-md px-4 pt-6 pb-10 sm:pt-12">
        <section className="border-border bg-surface rounded-card border p-6">
          <IconShield className="text-primary h-8 w-8" />
          <p className="text-text-muted mt-4 text-sm">
            {copy.admin.signedInAs} {account.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-text-muted mt-1 text-sm">{subtitle}</p>
          {children}
        </section>

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

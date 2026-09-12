'use client';

/**
 * Entrada al sistema.
 *
 * Es la primera pantalla real del producto. La mitad izquierda cuenta qué es
 * esto, la derecha pide las credenciales; en pantalla estrecha la izquierda
 * desaparece, porque ahí lo único que hace falta es entrar.
 */

import { IconProducts, IconSales, IconStock } from '@/components/ui/icons';
import { useCopy, type Copy } from '@/lib/i18n';

import { SignInForm } from './sign-in-form';

const BENEFITS = [
  { text: (copy: Copy) => copy.login.benefitOne, Icon: IconStock },
  { text: (copy: Copy) => copy.login.benefitTwo, Icon: IconProducts },
  { text: (copy: Copy) => copy.login.benefitThree, Icon: IconSales },
] as const;

export default function LoginPage(): React.ReactElement {
  const copy = useCopy();

  return (
    <div className="mx-auto grid min-h-[calc(100dvh-3.5rem)] max-w-5xl items-center gap-10 px-6 pb-10 lg:grid-cols-2">
      <section className="hidden lg:block">
        <p className="text-lg font-semibold tracking-tight">{copy.app.name}</p>
        <p className="mt-6 max-w-sm text-3xl leading-tight font-semibold">
          {copy.login.tagline}
        </p>
        <ul className="mt-8 space-y-3">
          {BENEFITS.map((benefit) => (
            <li
              key={benefit.text(copy)}
              className="text-text-muted flex items-center gap-3 text-sm"
            >
              <benefit.Icon className="h-5 w-5 shrink-0" />
              {benefit.text(copy)}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-border bg-surface rounded-card mx-auto w-full max-w-sm border p-6">
        <h1 className="text-2xl font-semibold tracking-tight">{copy.login.title}</h1>
        <p className="text-text-muted mt-1 text-sm">{copy.login.subtitle}</p>
        <SignInForm />
      </section>
    </div>
  );
}

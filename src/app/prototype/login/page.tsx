'use client';

import { useCopy, type Copy } from '@/lib/i18n';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../demo-credentials';
import { IconProducts, IconSales, IconStock } from '../ui/icons';
import { LanguageSwitcher } from '../ui/language-switcher';
import { LoginForm } from './login-form';

/**
 * Acceso al sistema.
 *
 * Queda fuera del marco de la aplicación porque no lleva navegación: quien aún
 * no entró no tiene a dónde ir. Solo el selector de idioma, porque quien llega
 * en español espera que el formulario ya esté en español.
 *
 * La mitad izquierda cuenta qué es esto y la derecha pide las credenciales. En
 * pantalla estrecha la izquierda desaparece, porque ahí lo único que hace falta
 * es entrar.
 *
 * Es de cliente porque lee el idioma elegido, igual que el resto de pantallas.
 * La lógica sigue repartida igual: el formulario es lo único que reacciona a lo
 * que escribe la persona.
 */

const BENEFITS = [
  { text: (copy: Copy) => copy.login.benefitOne, Icon: IconStock },
  { text: (copy: Copy) => copy.login.benefitTwo, Icon: IconProducts },
  { text: (copy: Copy) => copy.login.benefitThree, Icon: IconSales },
] as const;

export default function LoginPage(): React.ReactElement {
  const copy = useCopy();

  return (
    <div className="min-h-dvh">
      <div className="flex justify-end p-3">
        <LanguageSwitcher />
      </div>

      <div className="mx-auto grid min-h-[calc(100dvh-3.5rem)] max-w-5xl items-center gap-10 px-6 pb-10 lg:grid-cols-2">
        {/* Presentación. Decorativa: todo lo necesario para entrar está en el
            formulario, así que se oculta sin pérdida en pantallas pequeñas. */}
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
          <p className="text-text-muted mt-10 text-xs">{copy.app.prototypeNotice}</p>
        </section>

        <div className="mx-auto w-full max-w-sm">
          <section className="border-border bg-surface rounded-card border p-6">
            <h1 className="text-2xl font-semibold tracking-tight">{copy.login.title}</h1>
            <p className="text-text-muted mt-1 text-sm">{copy.login.subtitle}</p>
            <LoginForm />
          </section>

          {/* Recordatorio de las credenciales de la maqueta. Va fuera de la
              tarjeta porque no es parte de la pantalla que se está acordando:
              desaparece junto con el prototipo, igual que el archivo que las
              declara. */}
          <div className="border-border bg-surface-muted rounded-control mt-6 border p-3">
            <p className="text-xs font-medium">{copy.login.demoHintTitle}</p>
            <p className="text-text-muted mt-1 text-xs">{copy.login.demoHintBody}</p>
            <p className="mt-2 font-mono text-xs">
              {DEMO_EMAIL} · {DEMO_PASSWORD}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

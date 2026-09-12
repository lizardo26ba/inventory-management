'use client';

import { type Copy } from '@/lib/i18n';
import { useCopy } from '@/lib/i18n';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../demo-credentials';
import { IconProducts, IconSales, IconStock } from '../ui/icons';
import { LoginForm } from './login-form';

/**
 * Acceso al sistema.
 *
 * Queda fuera del marco de la aplicación porque no lleva navegación: quien aún
 * no entró no tiene a dónde ir. En escritorio se divide en dos, con el panel de
 * marca a la izquierda. En móvil el panel desaparece y queda solo el formulario.
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
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Panel de marca. Decorativo: todo lo necesario para entrar está en el
          formulario, así que se oculta sin pérdida en pantallas pequeñas. */}
      <div className="bg-primary text-text-inverted hidden flex-col justify-between p-12 lg:flex">
        <p className="text-lg font-semibold tracking-tight">{copy.app.name}</p>

        <div>
          <p className="max-w-sm text-3xl leading-tight font-semibold">{copy.login.tagline}</p>
          <ul className="mt-8 space-y-3">
            {BENEFITS.map((benefit) => (
              <li
                key={benefit.text(copy)}
                className="flex items-center gap-3 text-sm opacity-90"
              >
                <benefit.Icon className="h-5 w-5 shrink-0" />
                {benefit.text(copy)}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs opacity-70">{copy.app.prototypeNotice}</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">{copy.login.title}</h1>
          <p className="text-text-muted mt-1 text-sm">{copy.login.subtitle}</p>

          <LoginForm />

          {/* Recordatorio de las credenciales de la maqueta. Desaparece junto
              con el prototipo, igual que el archivo que las declara. */}
          <div className="border-border bg-surface-muted rounded-control mt-8 border p-3">
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

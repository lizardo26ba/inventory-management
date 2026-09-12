import { redirect } from 'next/navigation';

import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { getSession } from '@/modules/auth/session';
import { SIGNED_IN_PATH } from '@/modules/auth/routes';

/**
 * Marco de las pantallas públicas de acceso.
 *
 * No lleva navegación: quien está aquí todavía no tiene a dónde navegar. Solo el
 * selector de idioma, porque quien entra en español espera que el formulario ya
 * esté en español.
 *
 * Quien ya tiene sesión no ve estas pantallas. Dejar entrar a la de acceso a una
 * persona que ya entró invita a escribir sus credenciales otra vez sin motivo, y
 * confunde sobre si la sesión sigue viva.
 */
export default async function AuthLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): Promise<React.ReactElement> {
  const session = await getSession();
  if (session !== null) redirect(SIGNED_IN_PATH);

  return (
    <div className="min-h-dvh">
      <div className="flex justify-end p-3">
        <LanguageSwitcher />
      </div>
      {children}
    </div>
  );
}

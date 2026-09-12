import { redirect } from 'next/navigation';

import { SIGN_IN_PATH } from '@/modules/auth/routes';
import { getSession } from '@/modules/auth/session';

import { ChangePasswordHeading } from './change-password-heading';
import { ChangePasswordForm } from './change-password-form';

/**
 * Cambio de contraseña.
 *
 * Exige sesión, pero no exige que el cambio sea forzoso: quien quiera cambiarla
 * por gusto entra por la misma puerta. El aviso de arriba es lo único que
 * distingue los dos casos.
 */
export default async function ChangePasswordPage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) redirect(SIGN_IN_PATH);

  return (
    <main className="mx-auto w-full max-w-sm px-6 py-16">
      <ChangePasswordHeading isForced={session.mustChangePassword} email={session.email} />
      <ChangePasswordForm />
    </main>
  );
}

import { redirect } from 'next/navigation';

import { requiresPlatformAdminTwoFactor } from '@/lib/config/env.server';
import { resolveLanding } from '@/modules/auth/landing';
import { SIGN_IN_PATH, SIGNED_IN_PATH } from '@/modules/auth/routes';
import { getSession } from '@/modules/auth/session';

import { TwoFactorCodeForm } from './two-factor-code-form';
import { TwoFactorFrame } from './two-factor-frame';

/**
 * Pedir el código al entrar. RN-005, ADR 0014.
 *
 * Solo la ve quien la necesita: un super administrador con el factor activo que
 * todavía no lo superó en esta sesión. Lo decide la misma función que manda a
 * cada persona a su sitio al entrar, así que cualquier otro que escriba la
 * dirección vuelve a su pantalla.
 */
export default async function TwoFactorPage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) redirect(SIGN_IN_PATH);

  const landing = resolveLanding(session, {
    twoFactorRequired: requiresPlatformAdminTwoFactor,
  });
  if (landing.kind !== 'twoFactorVerify') redirect(SIGNED_IN_PATH);

  return (
    <TwoFactorFrame screen="verify" name={`${session.firstName} ${session.lastName}`}>
      <TwoFactorCodeForm screen="verify" className="mt-6" />
    </TwoFactorFrame>
  );
}

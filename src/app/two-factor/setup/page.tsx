import { redirect } from 'next/navigation';

import { resolveLanding } from '@/modules/auth/landing';
import { SIGN_IN_PATH, SIGNED_IN_PATH } from '@/modules/auth/routes';
import { getSession } from '@/modules/auth/session';
import { loadTwoFactorSetup } from '@/modules/auth/two-factor';

import { TwoFactorCodeForm } from '../two-factor-code-form';
import { TwoFactorFrame } from '../two-factor-frame';
import { TwoFactorSetupKey } from '../two-factor-setup-key';

/**
 * Activar el segundo factor. RN-005, ADR 0014.
 *
 * Solo la ve un super administrador que todavía no lo tiene activo. Abrirla crea
 * el alta pendiente, o enseña la que ya había: un QR escaneado en una visita
 * anterior sigue sirviendo.
 *
 * Se escanea y se confirma con un código antes de darlo por activo, porque
 * activar sin confirmar deja a alguien con un factor que su teléfono no genera.
 */
export default async function TwoFactorSetupPage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) redirect(SIGN_IN_PATH);

  const landing = resolveLanding(session);
  if (landing.kind !== 'twoFactorSetup') redirect(SIGNED_IN_PATH);

  const setup = await loadTwoFactorSetup(session);
  // Se activó en otra pestaña entre medias: lo que toca ahora es verificar.
  if (setup === null) redirect(SIGNED_IN_PATH);

  return (
    <TwoFactorFrame screen="setup" name={`${session.firstName} ${session.lastName}`}>
      <div className="mt-6 space-y-6">
        <TwoFactorSetupKey qrSvg={setup.qrSvg} manualKey={setup.manualKey} />
        <TwoFactorCodeForm screen="setup" />
      </div>
    </TwoFactorFrame>
  );
}

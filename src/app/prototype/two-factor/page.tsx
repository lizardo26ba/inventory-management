'use client';

/**
 * Pedir el código al entrar. RN-005.
 *
 * Llega aquí el super administrador que ya activó su segundo factor, justo
 * después de la contraseña. Hasta superarlo no hay sesión útil: ninguna pantalla
 * de plataforma se abre.
 *
 * El código de respaldo va detrás de un enlace y no al lado, porque es la salida
 * de emergencia, no la puerta. Al cambiar de modo el campo se vacía: un código de
 * la app escrito en el campo de respaldo sería un intento gastado sin motivo.
 *
 * En la aplicación real la comprobación es una Server Action con límite de
 * intentos, y el mensaje de error no dice cuántos quedan.
 */

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

import { useCopy } from '@/lib/i18n';
import { DEMO_RECOVERY_CODES, DEMO_TWO_FACTOR_CODE } from '../demo-credentials';
import { simulateWrite } from '../latency';
import { landingFor, useSessionStore } from '../session-store';
import { ActionButton, useAsyncAction } from '../ui/action-button';
import { Field } from '../ui/form';
import { FormAlert } from '../ui/form-alert';
import { isCodeComplete, OneTimeCodeField } from '../ui/one-time-code-field';
import { TwoFactorFrame } from './two-factor-frame';

const APP_CODE_LENGTH = 6;
/** Dos grupos de cuatro. El guion se ve, pero no se escribe. */
const RECOVERY_CODE_LENGTH = 8;
const RECOVERY_GROUP_SIZE = 4;

type Mode = 'app' | 'recovery';

export default function TwoFactorPage(): React.ReactElement {
  const copy = useCopy();
  const router = useRouter();
  const { account, passTwoFactor } = useSessionStore();
  const submit = useAsyncAction();
  const fieldId = useId();

  const [mode, setMode] = useState<Mode>('app');
  const [code, setCode] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const isApp = mode === 'app';

  function switchMode(): void {
    setMode(isApp ? 'recovery' : 'app');
    setCode('');
    setFieldError(null);
    setFormError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFormError(null);

    if (!isCodeComplete(code, isApp ? APP_CODE_LENGTH : RECOVERY_CODE_LENGTH)) {
      setFieldError(isApp ? copy.twoFactor.codeRequired : copy.twoFactor.recoveryRequired);
      return;
    }
    setFieldError(null);

    void submit.run(async () => {
      await simulateWrite();

      // Los de respaldo se enseñan con guion y se escriben sin él.
      const valid = isApp
        ? code === DEMO_TWO_FACTOR_CODE
        : DEMO_RECOVERY_CODES.some((recovery) => recovery.replace('-', '') === code);
      if (!valid) {
        setFormError(isApp ? copy.twoFactor.invalidCode : copy.twoFactor.invalidRecovery);
        return;
      }

      passTwoFactor();
      router.push(landingFor(account).path as never);
    });
  }

  const describedBy = fieldError !== null ? `${fieldId}-error` : `${fieldId}-help`;

  return (
    <TwoFactorFrame
      title={copy.twoFactor.verifyTitle}
      subtitle={isApp ? copy.twoFactor.verifySubtitle : copy.twoFactor.verifyRecoverySubtitle}
    >
      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        {formError !== null ? <FormAlert>{formError}</FormAlert> : null}

        <Field
          id={fieldId}
          label={isApp ? copy.twoFactor.codeLabel : copy.twoFactor.recoveryLabel}
          help={isApp ? copy.twoFactor.codeHelp : copy.twoFactor.recoveryHelp}
          error={fieldError ?? undefined}
        >
          <OneTimeCodeField
            key={mode}
            id={fieldId}
            value={code}
            onChange={setCode}
            length={isApp ? APP_CODE_LENGTH : RECOVERY_CODE_LENGTH}
            charset={isApp ? 'digits' : 'alphanumeric'}
            groupSize={isApp ? undefined : RECOVERY_GROUP_SIZE}
            groupLabel={isApp ? copy.twoFactor.codeLabel : copy.twoFactor.recoveryLabel}
            positionLabel={(position, total) =>
              `${copy.twoFactor.character} ${position} ${copy.twoFactor.characterOf} ${total}`
            }
            hasError={fieldError !== null}
            describedBy={describedBy}
          />
        </Field>

        <ActionButton
          type="submit"
          isPending={submit.isPending}
          pendingLabel={copy.twoFactor.verifying}
          className="h-10 w-full"
        >
          {copy.twoFactor.verify}
        </ActionButton>

        <button
          type="button"
          onClick={switchMode}
          className="text-primary text-sm underline-offset-4 hover:underline"
        >
          {isApp ? copy.twoFactor.useRecovery : copy.twoFactor.useApp}
        </button>
      </form>
    </TwoFactorFrame>
  );
}

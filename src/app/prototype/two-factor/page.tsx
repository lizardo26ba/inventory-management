'use client';

/**
 * Pedir el código al entrar. RN-005.
 *
 * Llega aquí el super administrador que ya activó su segundo factor, justo
 * después de la contraseña. Hasta superarlo no hay sesión útil: ninguna pantalla
 * de plataforma se abre.
 *
 * En la aplicación real la comprobación es una Server Action con límite de
 * intentos, y el mensaje de error no dice cuántos quedan.
 */

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

import { useCopy } from '@/lib/i18n';
import { DEMO_TWO_FACTOR_CODE } from '../demo-credentials';
import { simulateWrite } from '../latency';
import { landingFor, useSessionStore } from '../session-store';
import { ActionButton, useAsyncAction } from '../ui/action-button';
import { Field } from '../ui/form';
import { FormAlert } from '../ui/form-alert';
import { isCodeComplete, OneTimeCodeField } from '../ui/one-time-code-field';
import { TwoFactorFrame } from './two-factor-frame';

const CODE_LENGTH = 6;

export default function TwoFactorPage(): React.ReactElement {
  const copy = useCopy();
  const router = useRouter();
  const { account, passTwoFactor } = useSessionStore();
  const submit = useAsyncAction();
  const fieldId = useId();

  const [code, setCode] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFormError(null);

    if (!isCodeComplete(code, CODE_LENGTH)) {
      setFieldError(copy.twoFactor.codeRequired);
      return;
    }
    setFieldError(null);

    void submit.run(async () => {
      await simulateWrite();

      if (code !== DEMO_TWO_FACTOR_CODE) {
        setFormError(copy.twoFactor.invalidCode);
        return;
      }

      passTwoFactor();
      router.push(landingFor(account).path as never);
    });
  }

  return (
    <TwoFactorFrame title={copy.twoFactor.verifyTitle} subtitle={copy.twoFactor.verifySubtitle}>
      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        {formError !== null ? <FormAlert>{formError}</FormAlert> : null}

        <Field
          id={fieldId}
          label={copy.twoFactor.codeLabel}
          help={copy.twoFactor.codeHelp}
          error={fieldError ?? undefined}
        >
          <OneTimeCodeField
            id={fieldId}
            value={code}
            onChange={setCode}
            length={CODE_LENGTH}
            groupLabel={copy.twoFactor.codeLabel}
            positionLabel={(position, total) =>
              `${copy.twoFactor.digit} ${position} ${copy.twoFactor.digitOf} ${total}`
            }
            hasError={fieldError !== null}
            describedBy={fieldError !== null ? `${fieldId}-error` : `${fieldId}-help`}
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
      </form>
    </TwoFactorFrame>
  );
}

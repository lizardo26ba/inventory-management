'use client';

/**
 * El formulario del código, igual en las dos pantallas del segundo factor.
 *
 * Solo cambia a qué acción llama y cómo se llama el botón: comprobar el código
 * es la misma operación al verificar que al confirmar un alta. Qué hacer con el
 * código lo decide el servidor con la sesión. ADR 0014.
 *
 * Si vale, la acción redirige ella misma a donde toca; aquí no hay nada que
 * hacer después del éxito.
 */

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

import { ActionButton, useAsyncAction } from '@/components/ui/action-button';
import { Field } from '@/components/ui/form';
import { FormAlert } from '@/components/ui/form-alert';
import { isCodeComplete, OneTimeCodeField } from '@/components/ui/one-time-code-field';
import { useCopy } from '@/lib/i18n';
import { confirmTwoFactorSetup, verifyTwoFactor } from '@/modules/auth/actions';
import { twoFactorCodeSchema } from '@/modules/auth/schema';

import type { TwoFactorScreen } from './two-factor-frame';

const CODE_LENGTH = 6;

export function TwoFactorCodeForm({
  screen,
  className,
}: {
  readonly screen: TwoFactorScreen;
  readonly className?: string;
}): React.ReactElement {
  const copy = useCopy();
  const router = useRouter();
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

    const parsed = twoFactorCodeSchema.safeParse({ code });
    if (!parsed.success) {
      setFieldError(copy.fieldErrors.invalidTwoFactorCode);
      return;
    }
    setFieldError(null);

    void submit.run(async () => {
      const action = screen === 'verify' ? verifyTwoFactor : confirmTwoFactorSetup;
      const result = await action(parsed.data);
      if (result.ok) return;

      switch (result.error.code) {
        case 'VALIDATION_FAILED':
          // Un código equivocado se vuelve a escribir entero: dejar los dígitos
          // de uno que ya no vale invita a corregir solo uno.
          setCode('');
          setFieldError(copy.fieldErrors.invalidTwoFactorCode);
          return;
        case 'TOO_MANY_ATTEMPTS':
          setFormError(copy.errors.tooManyAttempts);
          return;
        case 'NOT_AUTHENTICATED':
          setFormError(copy.errors.sessionExpired);
          return;
        case 'CONFLICT':
          // El estado cambió en otra pestaña, o alguien lo restableció: la
          // pantalla que toca ya no es esta, y el servidor sabe cuál es.
          router.refresh();
          return;
        default:
          setFormError(copy.errors.generic);
      }
    });
  }

  const isVerify = screen === 'verify';

  return (
    <form onSubmit={handleSubmit} noValidate className={`space-y-4 ${className ?? ''}`}>
      {isVerify ? null : (
        <h2 className="text-sm font-semibold">{copy.twoFactor.stepConfirm}</h2>
      )}
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
        pendingLabel={isVerify ? copy.twoFactor.verifying : copy.twoFactor.activating}
        className="h-10 w-full"
      >
        {isVerify ? copy.twoFactor.verify : copy.twoFactor.activate}
      </ActionButton>
    </form>
  );
}

'use client';

/**
 * Cambio de contraseña del prototipo.
 *
 * La aplicación real ya tiene esta pantalla. Está aquí para acordar cómo se
 * muestran las contraseñas: un solo interruptor para los tres campos, debajo de
 * ellos. No cambia nada: al enviar solo comprueba lo mismo que el formulario
 * real antes de ir al servidor.
 */

import { useState } from 'react';

import { useCopy } from '@/lib/i18n';
import { simulateWrite } from '../latency';
import { ActionButton, useAsyncAction } from '../ui/action-button';
import { Field, INPUT_CLASS, inputBorderClass } from '../ui/form';
import { LanguageSwitcher } from '../ui/language-switcher';
import { Notice } from '../ui/notice';
import {
  PASSWORD_INPUT_CLASS,
  passwordInputType,
  ShowPasswordSwitch,
} from '../ui/show-password-switch';

const MINIMUM_PASSWORD_LENGTH = 12;

type FieldName = 'currentPassword' | 'newPassword' | 'confirmPassword';

export default function PrototypeChangePasswordPage(): React.ReactElement {
  const copy = useCopy();
  const submit = useAsyncAction();

  const [values, setValues] = useState<Record<FieldName, string>>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [isVisible, setIsVisible] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const fields = [
    {
      name: 'currentPassword',
      label: copy.changePassword.current,
      autoComplete: 'current-password',
    },
    {
      name: 'newPassword',
      label: copy.changePassword.next,
      autoComplete: 'new-password',
      help: copy.changePassword.rule,
    },
    {
      name: 'confirmPassword',
      label: copy.changePassword.confirm,
      autoComplete: 'new-password',
    },
  ] as const;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setIsDone(false);
    setIsVisible(false);

    const next: Partial<Record<FieldName, string>> = {
      ...(values.currentPassword === '' ? { currentPassword: copy.fieldErrors.required } : {}),
      ...(values.newPassword.length < MINIMUM_PASSWORD_LENGTH
        ? { newPassword: copy.fieldErrors.tooShort }
        : {}),
      ...(values.confirmPassword !== values.newPassword
        ? { confirmPassword: copy.fieldErrors.mismatch }
        : {}),
    };
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    void submit.run(async () => {
      await simulateWrite();
      setIsDone(true);
    });
  }

  return (
    <div className="min-h-dvh">
      <div className="flex justify-end p-3">
        <LanguageSwitcher />
      </div>

      <main className="mx-auto w-full max-w-sm px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">{copy.changePassword.title}</h1>
        <p className="text-text-muted mt-1 text-sm">admin@gt.com</p>

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          {isDone ? <Notice tone="info">{copy.app.prototypeNotice}</Notice> : null}

          {fields.map((field) => (
            <Field
              key={field.name}
              id={field.name}
              label={field.label}
              help={'help' in field ? field.help : undefined}
              error={errors[field.name]}
            >
              <input
                id={field.name}
                name={field.name}
                type={passwordInputType(isVisible)}
                autoComplete={field.autoComplete}
                value={values[field.name]}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [field.name]: event.target.value }))
                }
                aria-invalid={errors[field.name] !== undefined}
                className={`${INPUT_CLASS} ${PASSWORD_INPUT_CLASS} ${inputBorderClass(errors[field.name] !== undefined)}`}
              />
            </Field>
          ))}

          <ShowPasswordSwitch
            checked={isVisible}
            label={copy.changePassword.showPasswords}
            onChange={setIsVisible}
          />

          <ActionButton
            type="submit"
            isPending={submit.isPending}
            pendingLabel={copy.feedback.saving}
            className="h-10 w-full"
          >
            {copy.changePassword.submit}
          </ActionButton>

          <p className="text-text-muted pt-2 text-xs">{copy.changePassword.otherSessions}</p>
        </form>
      </main>
    </div>
  );
}

'use client';

/**
 * Cambio de contraseña.
 *
 * Vive fuera del grupo protegido a propósito: el marco del panel manda aquí a
 * quien todavía arrastra una contraseña puesta por otra persona, y si esta
 * pantalla estuviera dentro de ese marco el envío la mandaría a sí misma en
 * bucle.
 */

import { useState } from 'react';

import { ActionButton, useAsyncAction } from '@/components/ui/action-button';
import { INPUT_CLASS } from '@/components/ui/form';
import { useCopy } from '@/lib/i18n';
import { changePassword } from '@/modules/auth/actions';
import { changePasswordSchema, toFieldErrors } from '@/modules/auth/schema';

type FieldErrors = Readonly<Record<string, string>>;

export function ChangePasswordForm(): React.ReactElement {
  const copy = useCopy();
  const submit = useAsyncAction();

  const [values, setValues] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function messageFor(field: string): string | undefined {
    const key = fieldErrors[field];
    if (key === undefined) return undefined;
    return copy.fieldErrors[key as keyof typeof copy.fieldErrors] ?? copy.errors.generic;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFormError(null);

    const parsed = changePasswordSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});

    void submit.run(async () => {
      const result = await changePassword(parsed.data);
      if (result.ok) return;

      if (result.error.code === 'VALIDATION_FAILED') {
        setFieldErrors(result.error.fieldErrors ?? {});
        return;
      }

      setFormError(
        result.error.code === 'NOT_AUTHENTICATED'
          ? copy.errors.sessionExpired
          : copy.errors.generic,
      );
    });
  }

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

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
      {formError !== null ? (
        <p
          role="alert"
          className="border-danger bg-danger-soft text-danger rounded-control border px-3 py-2 text-sm"
        >
          {formError}
        </p>
      ) : null}

      {fields.map((field) => {
        const message = messageFor(field.name);
        return (
          <div key={field.name}>
            <label htmlFor={field.name} className="block text-sm font-medium">
              {field.label}
            </label>
            <input
              id={field.name}
              name={field.name}
              type="password"
              autoComplete={field.autoComplete}
              value={values[field.name]}
              onChange={(event) =>
                setValues((current) => ({ ...current, [field.name]: event.target.value }))
              }
              aria-invalid={message !== undefined}
              className={`${INPUT_CLASS} ${message === undefined ? 'border-border' : 'border-danger'}`}
            />
            {message !== undefined ? (
              <p className="text-danger mt-1.5 text-xs">{message}</p>
            ) : 'help' in field ? (
              <p className="text-text-muted mt-1.5 text-xs">{field.help}</p>
            ) : null}
          </div>
        );
      })}

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
  );
}

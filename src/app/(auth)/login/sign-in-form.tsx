'use client';

/**
 * Formulario de entrada real.
 *
 * Mismo dibujo que el del prototipo, con dos diferencias que importan: lo que
 * valida es el esquema Zod compartido con el servidor, y quien decide es una
 * Server Action, no un temporizador.
 *
 * La validación del navegador es cortesía, no defensa. Sirve para avisar antes
 * de gastar una vuelta a la red; el servidor vuelve a validar lo mismo porque
 * una petición puede llegar sin haber pasado por esta pantalla.
 */

import { useState } from 'react';

import { ActionButton, useAsyncAction } from '@/components/ui/action-button';
import { Field, INPUT_CLASS, inputBorderClass } from '@/components/ui/form';
import { FormAlert } from '@/components/ui/form-alert';
import { IconLock } from '@/components/ui/icons';
import { useCopy } from '@/lib/i18n';
import { signIn } from '@/modules/auth/actions';
import { signInSchema, toFieldErrors } from '@/modules/auth/schema';

type FieldErrors = Readonly<Record<string, string>>;

export function SignInForm(): React.ReactElement {
  const copy = useCopy();
  const submit = useAsyncAction();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});

    void submit.run(async () => {
      const result = await signIn(parsed.data);
      // Cuando entra bien, la acción redirige y este código no se alcanza.
      if (result.ok) return;

      if (result.error.code === 'VALIDATION_FAILED') {
        setFieldErrors(result.error.fieldErrors ?? {});
        return;
      }

      setFormError(
        result.error.code === 'TOO_MANY_ATTEMPTS'
          ? copy.errors.tooManyAttempts
          : result.error.code === 'NOT_AUTHENTICATED'
            ? copy.login.invalidCredentials
            : copy.errors.generic,
      );
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
      {formError !== null ? <FormAlert>{formError}</FormAlert> : null}

      <Field id="email" label={copy.login.email} error={messageFor('email')}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={copy.login.emailPlaceholder}
          aria-invalid={messageFor('email') !== undefined}
          aria-describedby={messageFor('email') !== undefined ? 'email-error' : undefined}
          className={`${INPUT_CLASS} ${inputBorderClass(messageFor('email') !== undefined)}`}
        />
      </Field>

      <Field id="password" label={copy.login.password} error={messageFor('password')}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={copy.login.passwordPlaceholder}
          aria-invalid={messageFor('password') !== undefined}
          aria-describedby={messageFor('password') !== undefined ? 'password-error' : undefined}
          className={`${INPUT_CLASS} ${inputBorderClass(messageFor('password') !== undefined)}`}
        />
      </Field>

      <ActionButton
        type="submit"
        isPending={submit.isPending}
        pendingLabel={copy.login.signingIn}
        className="h-10 w-full"
      >
        {copy.login.submit}
      </ActionButton>

      <p className="text-text-muted flex items-start gap-2 pt-2 text-xs">
        <IconLock className="mt-0.5 h-4 w-4 shrink-0" />
        {copy.login.securityNote}
      </p>
    </form>
  );
}

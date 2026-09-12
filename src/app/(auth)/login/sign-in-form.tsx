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
import { IconLock } from '@/components/ui/icons';
import { INPUT_CLASS } from '@/components/ui/form';
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

  function borderFor(field: string): string {
    return messageFor(field) === undefined ? 'border-border' : 'border-danger';
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
      {formError !== null ? (
        <p
          role="alert"
          className="border-danger bg-danger-soft text-danger rounded-control border px-3 py-2 text-sm"
        >
          {formError}
        </p>
      ) : null}

      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          {copy.login.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={copy.login.emailPlaceholder}
          aria-invalid={messageFor('email') !== undefined}
          className={`${INPUT_CLASS} ${borderFor('email')}`}
        />
        {messageFor('email') !== undefined ? (
          <p className="text-danger mt-1.5 text-xs">{messageFor('email')}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          {copy.login.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={copy.login.passwordPlaceholder}
          aria-invalid={messageFor('password') !== undefined}
          className={`${INPUT_CLASS} ${borderFor('password')}`}
        />
        {messageFor('password') !== undefined ? (
          <p className="text-danger mt-1.5 text-xs">{messageFor('password')}</p>
        ) : null}
      </div>

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

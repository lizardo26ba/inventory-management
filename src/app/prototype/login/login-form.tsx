'use client';

/**
 * Formulario de acceso de la maqueta.
 *
 * Comprueba las credenciales de demostración en el navegador y redirige. No hay
 * sesión, ni cookie, ni servidor: sirve para recorrer el prototipo y para
 * acordar cómo se ven los estados de error, de espera y de foco.
 *
 * En la aplicación real este componente conserva su forma pero delega en una
 * Server Action, la validación pasa por un esquema Zod compartido y el mensaje
 * de error es deliberadamente genérico, para no revelar si el correo existe.
 */

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';

import { useCopy } from '@/lib/i18n';
import { DEMO_LANDING_PATH, matchesDemoCredentials } from '../demo-credentials';
import { simulateWrite } from '../latency';
import { ActionButton, useAsyncAction } from '../ui/action-button';
import { Field, INPUT_CLASS, inputBorderClass } from '../ui/form';
import { FormAlert } from '../ui/form-alert';
import { IconLock } from '../ui/icons';

type FieldErrors = {
  readonly email?: string;
  readonly password?: string;
};

export function LoginForm(): React.ReactElement {
  const copy = useCopy();

  const router = useRouter();
  const submit = useAsyncAction();
  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const errors: FieldErrors = {
      ...(email.trim() === '' ? { email: copy.login.emailRequired } : {}),
      ...(password === '' ? { password: copy.login.passwordRequired } : {}),
    };

    setFieldErrors(errors);
    setFormError(null);

    if (errors.email !== undefined || errors.password !== undefined) return;

    void submit.run(async () => {
      await simulateWrite();

      if (matchesDemoCredentials(email, password)) {
        router.push(DEMO_LANDING_PATH as never);
        return;
      }
      // El mensaje no distingue entre correo inexistente y contraseña
      // equivocada: hacerlo permitiría averiguar qué cuentas existen.
      setFormError(copy.login.invalidCredentials);
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
      {formError !== null ? <FormAlert>{formError}</FormAlert> : null}

      <Field id={emailId} label={copy.login.email} error={fieldErrors.email}>
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={copy.login.emailPlaceholder}
          aria-invalid={fieldErrors.email !== undefined}
          aria-describedby={fieldErrors.email !== undefined ? `${emailId}-error` : undefined}
          className={`${INPUT_CLASS} ${inputBorderClass(fieldErrors.email !== undefined)}`}
        />
      </Field>

      <Field id={passwordId} label={copy.login.password} error={fieldErrors.password}>
        <input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={copy.login.passwordPlaceholder}
          aria-invalid={fieldErrors.password !== undefined}
          aria-describedby={
            fieldErrors.password !== undefined ? `${passwordId}-error` : undefined
          }
          className={`${INPUT_CLASS} ${inputBorderClass(fieldErrors.password !== undefined)}`}
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

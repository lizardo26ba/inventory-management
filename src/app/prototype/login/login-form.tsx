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
import { IconAlert, IconLock } from '../ui/icons';

/** Imita el viaje al servidor para que el estado de espera sea visible. */
const FAKE_ROUNDTRIP_MS = 400;

type FieldErrors = {
  readonly email?: string;
  readonly password?: string;
};

export function LoginForm(): React.ReactElement {
  const copy = useCopy();

  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const formErrorId = useId();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const errors: FieldErrors = {
      ...(email.trim() === '' ? { email: copy.login.emailRequired } : {}),
      ...(password === '' ? { password: copy.login.passwordRequired } : {}),
    };

    setFieldErrors(errors);
    setFormError(null);

    if (errors.email !== undefined || errors.password !== undefined) return;

    setIsSubmitting(true);

    window.setTimeout(() => {
      if (matchesDemoCredentials(email, password)) {
        router.push(DEMO_LANDING_PATH as never);
        return;
      }
      // El mensaje no distingue entre correo inexistente y contraseña
      // equivocada: hacerlo permitiría averiguar qué cuentas existen.
      setIsSubmitting(false);
      setFormError(copy.login.invalidCredentials);
    }, FAKE_ROUNDTRIP_MS);
  }

  const inputClass =
    'mt-1.5 h-10 w-full rounded-control border bg-surface px-3 text-sm placeholder:text-text-muted';

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
      {formError !== null ? (
        <p
          id={formErrorId}
          role="alert"
          className="bg-danger-soft text-danger rounded-control flex items-start gap-2 px-3 py-2 text-sm"
        >
          <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {formError}
        </p>
      ) : null}

      <div>
        <label htmlFor={emailId} className="block text-sm font-medium">
          {copy.login.email}
        </label>
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
          className={`${inputClass} ${
            fieldErrors.email !== undefined ? 'border-danger' : 'border-border'
          }`}
        />
        {fieldErrors.email !== undefined ? (
          <p id={`${emailId}-error`} className="text-danger mt-1 text-xs">
            {fieldErrors.email}
          </p>
        ) : null}
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor={passwordId} className="block text-sm font-medium">
            {copy.login.password}
          </label>
          <button type="button" className="text-primary text-xs hover:underline">
            {copy.login.forgot}
          </button>
        </div>
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
          className={`${inputClass} ${
            fieldErrors.password !== undefined ? 'border-danger' : 'border-border'
          }`}
        />
        {fieldErrors.password !== undefined ? (
          <p id={`${passwordId}-error`} className="text-danger mt-1 text-xs">
            {fieldErrors.password}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-primary text-text-inverted hover:bg-primary-hover rounded-control h-10 w-full text-sm font-medium transition-colors disabled:opacity-70"
      >
        {isSubmitting ? copy.login.signingIn : copy.login.submit}
      </button>

      <p className="text-text-muted flex items-start gap-2 pt-2 text-xs">
        <IconLock className="mt-0.5 h-4 w-4 shrink-0" />
        {copy.login.securityNote}
      </p>
    </form>
  );
}

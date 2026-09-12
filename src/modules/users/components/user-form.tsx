'use client';

/**
 * Formulario de usuario, compartido por el alta y la edición.
 *
 * Tres secciones que responden a tres preguntas distintas: quién es, a qué
 * empresas entra, y qué puede hacer en ellas.
 *
 * El acceso es una lista de empresa y rol porque una persona alcanza varias
 * empresas y no tiene por qué ocupar el mismo puesto en todas.
 *
 * Los permisos no se marcan de uno en uno: se muestran ya resueltos a partir de
 * los roles elegidos. Si hace falta una combinación nueva, se crea un rol.
 *
 * La contraseña no se pide. La genera el servidor y se muestra una vez al
 * terminar el alta: que el administrador elija la contraseña de otra persona es
 * una credencial compartida desde el primer día.
 *
 * Al editar viaja la versión que tenía la cuenta al abrir la pantalla. Si otra
 * persona guardó mientras tanto, el servidor rechaza y esta pantalla lo dice en
 * lugar de pisar su trabajo.
 */

import Link from 'next/link';
import { useState } from 'react';

import { ActionButton, useAsyncAction } from '@/components/ui/action-button';
import { buttonClass } from '@/components/ui/button';
import { CountrySelect, type CountryChoice } from '@/components/ui/country-select';
import { DefinitionList, DefinitionRow } from '@/components/ui/definition-list';
import { Field, INPUT_CLASS, Section, inputBorderClass } from '@/components/ui/form';
import { FormAlert } from '@/components/ui/form-alert';
import { Notice } from '@/components/ui/notice';
import { Toggle } from '@/components/ui/toggle';
import { useCopy } from '@/lib/i18n';

import { createUser, updateUser } from '../actions';
import { USERS_PATH } from '../routes';
import { createUserSchema, updateUserSchema, type AccessInput } from '../schema';
import { type OrganizationChoice } from '../types';
import { AccessPicker } from './access-picker';
import { PermissionPreview } from './permission-preview';

type FieldErrors = Readonly<Record<string, string>>;

export type UserFormValues = {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly countryCode: string;
  readonly accesses: readonly AccessInput[];
  readonly isPlatformAdmin: boolean;
  readonly platformAdminReason: string;
};

export type UserBeingEdited = {
  readonly id: string;
  readonly version: number;
  readonly values: UserFormValues;
};

/** Lo que hay que decir una sola vez cuando la cuenta queda creada. */
type CreatedAccount = {
  readonly email: string;
  readonly temporaryPassword: string;
};

export function UserForm({
  countries,
  organizations,
  user,
}: {
  readonly countries: readonly CountryChoice[];
  readonly organizations: readonly OrganizationChoice[];
  /** Presente solo al editar. */
  readonly user?: UserBeingEdited;
}): React.ReactElement {
  const copy = useCopy();
  const submit = useAsyncAction();

  const isEditing = user !== undefined;
  const firstCountry = countries[0];

  const [values, setValues] = useState<UserFormValues>(
    user?.values ?? {
      firstName: '',
      lastName: '',
      email: '',
      countryCode: firstCountry?.code ?? '',
      accesses: [],
      isPlatformAdmin: false,
      platformAdminReason: '',
    },
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedAccount | null>(null);
  const [hasCopiedPassword, setHasCopiedPassword] = useState(false);

  function messageFor(field: string): string | undefined {
    const key = fieldErrors[field];
    if (key === undefined) return undefined;
    return copy.fieldErrors[key as keyof typeof copy.fieldErrors] ?? copy.errors.generic;
  }

  function clearError(field: string): void {
    setFieldErrors((current) => {
      if (current[field] === undefined) return current;
      const { [field]: _removed, ...rest } = current;
      return rest;
    });
    setFormError(null);
  }

  function setValue(
    field: 'firstName' | 'lastName' | 'email' | 'countryCode',
    next: string,
  ): void {
    setValues((current) => ({ ...current, [field]: next }));
    clearError(field);
  }

  function setAccesses(next: readonly AccessInput[]): void {
    setValues((current) => ({ ...current, accesses: next }));
    clearError('accesses');
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFormError(null);

    // El mismo esquema que usa el servidor, para que el aviso llegue sin esperar
    // la vuelta a la red. El que decide sigue siendo el de allá.
    const parsed = isEditing
      ? updateUserSchema.safeParse({ ...values, id: user.id, version: user.version })
      : createUserSchema.safeParse(values);

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = typeof issue.path[0] === 'string' ? issue.path[0] : 'form';
        next[field] ??= issue.message;
      }
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});

    void submit.run(async () => {
      if (isEditing) {
        const result = await updateUser(parsed.data);
        // Cuando sale bien, la acción navega y este código no se alcanza.
        if (result.ok) return;

        if (result.error.fieldErrors !== undefined) {
          setFieldErrors(result.error.fieldErrors);
          return;
        }

        // Quien guardó primero no puede perder su trabajo por llegar antes. Lo
        // escrito aquí se queda en pantalla para poder copiarlo antes de recargar.
        if (result.error.code === 'STALE_VERSION') {
          setFormError(copy.users.staleVersion);
          return;
        }

        setFormError(
          result.error.code === 'NOT_AUTHORIZED'
            ? copy.errors.notAuthorized
            : copy.errors.generic,
        );
        return;
      }

      const result = await createUser(parsed.data);

      if (result.ok) {
        // El alta no navega: la contraseña se muestra una vez y nadie más la va a
        // poder ver.
        setCreated({ email: result.email, temporaryPassword: result.temporaryPassword });
        return;
      }

      if (result.error.fieldErrors !== undefined) {
        setFieldErrors(result.error.fieldErrors);
        return;
      }

      setFormError(
        result.error.code === 'NOT_AUTHORIZED'
          ? copy.errors.notAuthorized
          : copy.errors.generic,
      );
    });
  }

  function borderFor(field: string): string {
    return inputBorderClass(messageFor(field) !== undefined);
  }

  if (created !== null) {
    return (
      <Section title={copy.userForm.createdTitle} help={copy.userForm.createdHelp}>
        <DefinitionList>
          <DefinitionRow label={copy.userForm.createdEmail}>{created.email}</DefinitionRow>
          <DefinitionRow label={copy.userForm.createdPassword}>
            <span className="font-mono text-sm">{created.temporaryPassword}</span>
          </DefinitionRow>
        </DefinitionList>

        <p className="text-text-muted text-xs">{copy.userForm.createdChange}</p>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={async () => {
              // Si el navegador no deja escribir en el portapapeles, el texto
              // sigue a la vista para copiarlo a mano. No se pierde nada.
              await navigator.clipboard.writeText(created.temporaryPassword);
              setHasCopiedPassword(true);
            }}
            className={buttonClass({ variant: 'secondary', size: 'md' })}
          >
            {hasCopiedPassword ? copy.userForm.createdCopied : copy.userForm.createdCopy}
          </button>
          <Link href={USERS_PATH} className={buttonClass({ size: 'md' })}>
            {copy.userForm.createdDone}
          </Link>
        </div>
      </Section>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError !== null ? <FormAlert>{formError}</FormAlert> : null}

      <Section title={copy.userForm.sectionIdentity}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="user-first-name"
            label={copy.userForm.firstName}
            error={messageFor('firstName')}
          >
            <input
              id="user-first-name"
              type="text"
              value={values.firstName}
              onChange={(event) => setValue('firstName', event.target.value)}
              aria-invalid={messageFor('firstName') !== undefined}
              className={`${INPUT_CLASS} ${borderFor('firstName')}`}
            />
          </Field>

          <Field
            id="user-last-name"
            label={copy.userForm.lastName}
            error={messageFor('lastName')}
          >
            <input
              id="user-last-name"
              type="text"
              value={values.lastName}
              onChange={(event) => setValue('lastName', event.target.value)}
              aria-invalid={messageFor('lastName') !== undefined}
              className={`${INPUT_CLASS} ${borderFor('lastName')}`}
            />
          </Field>
        </div>

        <Field
          id="user-email"
          label={copy.userForm.email}
          help={copy.userForm.emailHelp}
          error={messageFor('email')}
        >
          <input
            id="user-email"
            type="email"
            value={values.email}
            onChange={(event) => setValue('email', event.target.value)}
            aria-invalid={messageFor('email') !== undefined}
            className={`${INPUT_CLASS} ${borderFor('email')}`}
          />
        </Field>

        <div>
          <label htmlFor="user-country" className="block text-sm font-medium">
            {copy.userForm.country}
          </label>
          <CountrySelect
            id="user-country"
            value={values.countryCode}
            options={countries}
            onChange={(countryCode) => setValue('countryCode', countryCode)}
          />
          <p className="text-text-muted mt-1.5 text-xs">{copy.userForm.countryHelp}</p>
        </div>
      </Section>

      {/* El acceso de plataforma va antes que el de empresas y en su propia
          sección a propósito. No es un rol más: no se concede dentro de una
          empresa, alcanza a todas, y meterlo entre las casillas de empresa lo
          haría parecer del mismo peso que ellas. ADR 0005. */}
      <Section title={copy.userForm.sectionPlatform} help={copy.userForm.platformHelp}>
        <span className="flex items-center gap-2">
          <Toggle
            checked={values.isPlatformAdmin}
            label={copy.userForm.platformToggle}
            onChange={(next) => {
              setValues((current) => ({ ...current, isPlatformAdmin: next }));
              clearError('isPlatformAdmin');
              clearError('platformAdminReason');
            }}
          />
          <span className="text-sm">{copy.userForm.platformToggle}</span>
        </span>

        {messageFor('isPlatformAdmin') !== undefined ? (
          <p role="alert" className="text-danger text-xs">
            {messageFor('isPlatformAdmin')}
          </p>
        ) : null}

        {values.isPlatformAdmin ? (
          <>
            <Notice>{copy.userForm.platformWarning}</Notice>

            <Field
              id="user-platform-reason"
              label={copy.userForm.platformReason}
              help={copy.userForm.platformReasonHelp}
              error={messageFor('platformAdminReason')}
            >
              <input
                id="user-platform-reason"
                type="text"
                value={values.platformAdminReason}
                onChange={(event) => {
                  setValues((current) => ({
                    ...current,
                    platformAdminReason: event.target.value,
                  }));
                  clearError('platformAdminReason');
                }}
                aria-invalid={messageFor('platformAdminReason') !== undefined}
                className={`${INPUT_CLASS} ${borderFor('platformAdminReason')}`}
              />
            </Field>
          </>
        ) : null}
      </Section>

      <Section title={copy.userForm.sectionAccess} help={copy.userForm.accessHelp}>
        <AccessPicker
          organizations={organizations}
          accesses={values.accesses}
          onChange={setAccesses}
        />

        {messageFor('accesses') !== undefined ? (
          <p role="alert" className="text-danger text-xs">
            {messageFor('accesses')}
          </p>
        ) : null}
      </Section>

      <Section title={copy.userForm.sectionPermissions} help={copy.userForm.permissionsHelp}>
        <PermissionPreview accesses={values.accesses} organizations={organizations} />
      </Section>

      <div className="flex justify-end gap-2">
        <Link
          href={USERS_PATH}
          aria-disabled={submit.isPending}
          className={buttonClass({
            variant: 'secondary',
            size: 'md',
            className: submit.isPending ? 'pointer-events-none opacity-60' : '',
          })}
        >
          {copy.userForm.cancel}
        </Link>
        <ActionButton
          type="submit"
          isPending={submit.isPending}
          pendingLabel={copy.feedback.saving}
          className="h-10 px-4"
        >
          {isEditing ? copy.userForm.save : copy.userForm.submit}
        </ActionButton>
      </div>
    </form>
  );
}

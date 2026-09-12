'use client';

/**
 * Formulario de usuario, compartido por el alta y la edición.
 *
 * Tres secciones que responden a tres preguntas distintas: quién es, a qué
 * empresas entra, y qué puede hacer en ellas.
 *
 * El acceso es una matriz de empresa y rol porque una persona alcanza varias
 * empresas y no tiene por qué ocupar el mismo puesto en todas. Marcar la
 * empresa concede el acceso; el rol dice con qué alcance.
 *
 * Los permisos no se marcan de uno en uno: se muestran ya resueltos a partir de
 * los roles elegidos. Repartir permisos sueltos por persona parece flexible y
 * termina en una maraña que nadie sabe auditar. Si hace falta una combinación
 * nueva, se crea un rol.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { ActionButton, useAsyncAction } from '../../ui/action-button';
import { useCompanyStore } from '../../company-store';
import { useCopy } from '@/lib/i18n';
import { CountrySelect } from '../../ui/country-select';
import { buttonClass } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { FilterInput } from '../../ui/filter-input';
import { Field, INPUT_CLASS, Section, Select } from '../../ui/form';
import { CountryFlag } from '../../ui/flag';
import { PhotoField } from '../../photo-field';
import { countryOptions } from '../../fake-data';
import { useUserStore, type UserInput } from '../../user-store';
import {
  effectivePermissions,
  permissionGroups,
  roles,
  type Membership,
} from '../../users-data';

const USERS_PATH = '/prototype/users';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormValues = {
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  memberships: readonly Membership[];
  photoDataUrl: string | undefined;
};

type FieldName = 'firstName' | 'lastName' | 'email';

export function UserForm({
  userId,
  initialValues,
}: {
  readonly userId?: string;
  readonly initialValues?: Partial<FormValues>;
}): React.ReactElement {
  const copy = useCopy();

  const router = useRouter();
  const { companies } = useCompanyStore();
  const { createUser, updateUser } = useUserStore();
  const submit = useAsyncAction();
  const isEditing = userId !== undefined;

  const firstCountry = countryOptions[0];
  const [values, setValues] = useState<FormValues>({
    firstName: initialValues?.firstName ?? '',
    lastName: initialValues?.lastName ?? '',
    email: initialValues?.email ?? '',
    countryCode: initialValues?.countryCode ?? firstCountry?.code ?? '',
    memberships: initialValues?.memberships ?? [],
    photoDataUrl: initialValues?.photoDataUrl,
  });
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [companyFilter, setCompanyFilter] = useState('');

  const granted = useMemo(
    () => new Map(values.memberships.map((m) => [m.companyId, m.roleCode])),
    [values.memberships],
  );
  const permissions = useMemo(
    () => effectivePermissions(values.memberships),
    [values.memberships],
  );

  const visibleCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(companyFilter.trim().toLowerCase()),
  );

  function setValue(field: FieldName, next: string): void {
    setValues((current) => ({ ...current, [field]: next }));
  }

  function toggleCompany(companyId: string, isGranted: boolean): void {
    setValues((current) => ({
      ...current,
      memberships: isGranted
        ? [...current.memberships, { companyId, roleCode: roles[0]?.code ?? '' }]
        : current.memberships.filter((m) => m.companyId !== companyId),
    }));
  }

  function setRole(companyId: string, roleCode: string): void {
    setValues((current) => ({
      ...current,
      memberships: current.memberships.map((m) =>
        m.companyId === companyId ? { ...m, roleCode } : m,
      ),
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const nextErrors: Partial<Record<FieldName, string>> = {};
    if (values.firstName.trim() === '') nextErrors.firstName = copy.userForm.requiredField;
    if (values.lastName.trim() === '') nextErrors.lastName = copy.userForm.requiredField;
    if (values.email.trim() === '') nextErrors.email = copy.userForm.requiredField;
    else if (!EMAIL_PATTERN.test(values.email.trim())) {
      nextErrors.email = copy.userForm.invalidEmail;
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const input: UserInput = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      countryCode: values.countryCode,
      memberships: values.memberships,
      photoDataUrl: values.photoDataUrl,
    };

    // Se navega después de que la escritura termine, no antes. Adelantarse
    // llevaría a una lista que todavía no tiene el cambio.
    void submit.run(async () => {
      if (isEditing) await updateUser(userId, input);
      else await createUser(input);
      router.push(USERS_PATH as never);
    });
  }

  function borderFor(field: FieldName): string {
    return errors[field] !== undefined ? 'border-danger' : 'border-border';
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <Section title={copy.userForm.sectionIdentity}>
        <PhotoField
          name={`${values.firstName} ${values.lastName}`.trim()}
          photoDataUrl={values.photoDataUrl}
          onChange={(photoDataUrl) => setValues((current) => ({ ...current, photoDataUrl }))}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="user-first-name" label={copy.userForm.firstName} error={errors.firstName}>
            <input
              id="user-first-name"
              type="text"
              value={values.firstName}
              onChange={(event) => setValue('firstName', event.target.value)}
              aria-invalid={errors.firstName !== undefined}
              className={`${INPUT_CLASS} ${borderFor('firstName')}`}
            />
          </Field>

          <Field id="user-last-name" label={copy.userForm.lastName} error={errors.lastName}>
            <input
              id="user-last-name"
              type="text"
              value={values.lastName}
              onChange={(event) => setValue('lastName', event.target.value)}
              aria-invalid={errors.lastName !== undefined}
              className={`${INPUT_CLASS} ${borderFor('lastName')}`}
            />
          </Field>
        </div>

        <Field
          id="user-email"
          label={copy.userForm.email}
          help={copy.userForm.emailHelp}
          error={errors.email}
        >
          <input
            id="user-email"
            type="email"
            value={values.email}
            onChange={(event) => setValue('email', event.target.value)}
            aria-invalid={errors.email !== undefined}
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
            options={countryOptions}
            onChange={(countryCode) => setValues((current) => ({ ...current, countryCode }))}
          />
          <p className="text-text-muted mt-1.5 text-xs">{copy.userForm.countryHelp}</p>
        </div>
      </Section>

      <Section title={copy.userForm.sectionAccess} help={copy.userForm.accessHelp}>
        <FilterInput
          value={companyFilter}
          onChange={setCompanyFilter}
          placeholder={copy.organizations.searchPlaceholder}
        />

        {/* La lista se desplaza dentro de su caja. Con veintidós empresas, y
            más adelante muchas más, el formulario entero no puede crecer. */}
        <div className="border-border rounded-control max-h-80 overflow-y-auto border">
          {visibleCompanies.map((company) => {
            const roleCode = granted.get(company.id);
            const isGranted = roleCode !== undefined;
            return (
              <div
                key={company.id}
                className="border-border flex items-center gap-3 border-b px-3 py-2 last:border-0"
              >
                <Checkbox
                  id={`grant-${company.id}`}
                  checked={isGranted}
                  onChange={(next) => toggleCompany(company.id, next)}
                />
                <CountryFlag countryCode={company.countryCode} className="h-4 w-4" />
                <label
                  htmlFor={`grant-${company.id}`}
                  className="min-w-0 flex-1 truncate text-sm"
                >
                  {company.name}
                </label>

                <Select
                  value={roleCode ?? ''}
                  disabled={!isGranted}
                  onChange={(next) => setRole(company.id, next)}
                  size="sm"
                  label={`${copy.userForm.roleColumn} · ${company.name}`}
                  className="w-40 shrink-0"
                >
                  {roles.map((role) => (
                    <option key={role.code} value={role.code}>
                      {role.name}
                    </option>
                  ))}
                </Select>
              </div>
            );
          })}
        </div>

        {values.memberships.length === 0 ? (
          <p className="text-warning text-xs">{copy.userForm.accessEmpty}</p>
        ) : null}
      </Section>

      <Section title={copy.userForm.sectionPermissions} help={copy.userForm.permissionsHelp}>
        {values.memberships.length === 0 ? (
          <p className="text-text-muted text-sm">{copy.userForm.permissionsEmpty}</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {permissionGroups.map((group) => (
              <div key={group.code}>
                <p className="text-text-muted text-xs font-semibold tracking-wide uppercase">
                  {group.label}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {group.permissions.map((permission) => {
                    const isGranted = permissions.has(permission.code);
                    return (
                      <li
                        key={permission.code}
                        className={`flex items-center gap-2 text-sm ${
                          isGranted ? '' : 'text-text-muted'
                        }`}
                      >
                        <Checkbox checked={isGranted} label={permission.label} isReadOnly />
                        {permission.label}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="flex justify-end gap-2">
        <Link
          href={USERS_PATH as never}
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

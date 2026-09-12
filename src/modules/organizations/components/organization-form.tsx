'use client';

/**
 * Formulario de empresa, compartido por el alta y la edición.
 *
 * Una sola columna, agrupada en secciones con título y la ayuda de cada campo
 * debajo del campo. Un formulario de dos columnas obliga a la vista a
 * zigzaguear, se cometen más errores y en móvil se rompe igual.
 *
 * El país manda sobre tres cosas: cómo se llama el número de contribuyente, qué
 * moneda se propone y cómo se escribe el teléfono. Cambiar el país las cambia
 * las tres, porque son consecuencias suyas y no decisiones aparte.
 *
 * El código no se pide. Lo asigna el sistema a partir del nombre comercial y no
 * cambia nunca, porque encabeza el número de cada documento. Al crear se muestra
 * el que se va a asignar, porque quien da de alta tiene derecho a verlo antes de
 * confirmar; al editar se muestra el que ya tiene y no se mueve aunque el nombre
 * cambie.
 *
 * La moneda base solo se elige al crear. Es la unidad en la que está valorado
 * todo el inventario, así que cambiarla no convertiría los costos, los
 * reinterpretaría.
 *
 * Al editar viaja la versión que tenía la empresa al abrir la pantalla. Si otra
 * persona guardó mientras tanto, el servidor rechaza y esta pantalla lo dice en
 * lugar de pisar su trabajo.
 *
 * Las piezas visuales salen de `@/components/ui/form` y no se copian aquí: dos
 * altas del mismo sistema tienen que verse iguales.
 */

import Link from 'next/link';
import { useState } from 'react';

import { ActionButton, useAsyncAction } from '@/components/ui/action-button';
import { buttonClass } from '@/components/ui/button';
import { CountrySelect } from '@/components/ui/country-select';
import {
  Field,
  INPUT_CLASS,
  Section,
  Select,
  Textarea,
  inputBorderClass,
} from '@/components/ui/form';
import { FormAlert } from '@/components/ui/form-alert';
import { PhoneField } from '@/components/ui/phone-field';
import { useCopy } from '@/lib/i18n';
import { applyPhoneMask, digitsOf, isPhoneComplete } from '@/lib/phone';

import { createOrganization, updateOrganization } from '../actions';
import { ORGANIZATIONS_PATH } from '../routes';
import { createOrganizationSchema, updateOrganizationSchema } from '../schema';
import { buildOrganizationSlug } from '../service';
import { type CountryOption, type CurrencyOption } from '../repository';

type FieldErrors = Readonly<Record<string, string>>;

/** Lo que el formulario enseña. El teléfono, sin el prefijo del país. */
export type OrganizationFormValues = {
  readonly name: string;
  readonly legalName: string;
  readonly countryCode: string;
  readonly baseCurrencyCode: string;
  readonly taxId: string;
  readonly email: string;
  readonly phoneNumber: string;
  readonly address: string;
};

/** Lo que hace falta para editar, y que al crear todavía no existe. */
export type OrganizationBeingEdited = {
  readonly id: string;
  readonly slug: string;
  readonly version: number;
  readonly values: OrganizationFormValues;
};

export function OrganizationForm({
  countries,
  currencies,
  takenSlugs = [],
  organization,
}: {
  readonly countries: readonly CountryOption[];
  readonly currencies: readonly CurrencyOption[];
  /** Los códigos ya usados, para enseñar el que se va a asignar sin choques. */
  readonly takenSlugs?: readonly string[];
  /** Presente solo al editar. Su ausencia es lo que significa "alta". */
  readonly organization?: OrganizationBeingEdited;
}): React.ReactElement {
  const copy = useCopy();
  const submit = useAsyncAction();
  const isEditing = organization !== undefined;

  const firstCountry = countries[0];
  const [values, setValues] = useState<OrganizationFormValues>(
    organization?.values ?? {
      name: '',
      legalName: '',
      countryCode: firstCountry?.code ?? '',
      baseCurrencyCode: firstCountry?.defaultCurrencyCode ?? '',
      taxId: '',
      email: '',
      // El número nacional, sin prefijo. El prefijo lo pone el país y se une al
      // enviar: no es un dato que nadie escriba.
      phoneNumber: '',
      address: '',
    },
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  // El aviso de choque lleva una segunda frase que solo tiene sentido cuando el
  // problema es el identificador fiscal. Acompañando a otro fallo, despista.
  const [isTaxIdConflict, setIsTaxIdConflict] = useState(false);

  const country = countries.find((candidate) => candidate.code === values.countryCode);
  const phonePrefix = country?.phonePrefix ?? '';
  const phoneMask = country?.phoneMask ?? '';

  // Al editar se muestra el que ya tiene, que no cambia aunque cambie el
  // nombre. Al crear todavía no existe: se muestra el que se va a asignar,
  // calculado contra los que hay ahora. El servidor lo vuelve a calcular al
  // escribir la fila, así que un alta simultánea no deja aquí un código
  // equivocado, solo una previsión.
  const code = isEditing
    ? organization.slug.toUpperCase()
    : values.name.trim() === ''
      ? ''
      : buildOrganizationSlug(values.name, takenSlugs).toUpperCase();

  function messageFor(field: string): string | undefined {
    const key = fieldErrors[field];
    if (key === undefined) return undefined;
    return copy.fieldErrors[key as keyof typeof copy.fieldErrors] ?? copy.errors.generic;
  }

  function clearError(field: string): void {
    // Corregir un campo retira su aviso en el acto. Dejarlo hasta el siguiente
    // envío haría que el formulario contradijera a lo que se acaba de escribir.
    setFieldErrors((current) => {
      if (current[field] === undefined) return current;
      const { [field]: _removed, ...rest } = current;
      return rest;
    });
    setFormError(null);
    setIsTaxIdConflict(false);
  }

  function setValue(field: keyof typeof values, next: string): void {
    setValues((current) => ({ ...current, [field]: next }));
    clearError(field);
  }

  /**
   * El número se guarda ya separado según el país. Se teclean solo dígitos: los
   * espacios los pone el formulario, y lo que sobra de la longitud del país se
   * descarta en lugar de aceptarse y fallar al enviar.
   */
  function setPhoneNumber(typed: string): void {
    setValues((current) => ({
      ...current,
      phoneNumber: applyPhoneMask(digitsOf(typed), phoneMask),
    }));
    clearError('phone');
  }

  // Cambiar de país arrastra la moneda propuesta y vuelve a separar el teléfono
  // con la plantilla del país nuevo. El prefijo se deriva en cada renderizado,
  // así que no hay nada que arrastrar.
  //
  // Al editar, la moneda se queda donde está: ya hay costos valorados en ella.
  function changeCountry(countryCode: string): void {
    const next = countries.find((candidate) => candidate.code === countryCode);
    setValues((current) => ({
      ...current,
      countryCode,
      baseCurrencyCode: isEditing
        ? current.baseCurrencyCode
        : (next?.defaultCurrencyCode ?? current.baseCurrencyCode),
      phoneNumber: applyPhoneMask(digitsOf(current.phoneNumber), next?.phoneMask ?? ''),
    }));
    // El choque de identificador fiscal es por país: cambiarlo invalida el aviso.
    setFieldErrors({});
    setFormError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFormError(null);
    setIsTaxIdConflict(false);

    // Un teléfono a medias no sirve para llamar. Vacío sí vale: el dato es
    // opcional, lo que no vale es dejarlo empezado. La misma regla la repite el
    // servidor, que es quien decide.
    if (values.phoneNumber !== '' && !isPhoneComplete(values.phoneNumber, phoneMask)) {
      setFieldErrors({ phone: 'incompletePhone' });
      return;
    }

    const submitted = {
      ...values,
      phone:
        values.phoneNumber.trim() === '' ? '' : `${phonePrefix} ${values.phoneNumber}`.trim(),
    };

    // El mismo esquema que usa el servidor, para que el aviso llegue sin
    // esperar la vuelta a la red. El que decide sigue siendo el de allá.
    const parsed = isEditing
      ? updateOrganizationSchema.safeParse({
          ...submitted,
          id: organization.id,
          version: organization.version,
        })
      : createOrganizationSchema.safeParse(submitted);

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path.join('.');
        if (field !== '' && next[field] === undefined) next[field] = issue.message;
      }
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});

    void submit.run(async () => {
      const result = isEditing
        ? await updateOrganization(parsed.data)
        : await createOrganization(parsed.data);
      // Cuando sale bien, la acción navega y este código no se alcanza.
      if (result.ok) return;

      if (result.error.fieldErrors !== undefined) {
        setFieldErrors(result.error.fieldErrors);
        if (result.error.code === 'CONFLICT') {
          setFormError(copy.organizationForm.duplicateTaxId);
          setIsTaxIdConflict(true);
        }
        return;
      }

      // Quien guardó primero no puede perder su trabajo por llegar antes. Lo
      // escrito aquí se queda en pantalla para poder copiarlo antes de recargar.
      if (result.error.code === 'STALE_VERSION') {
        setFormError(copy.errors.staleVersion);
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

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError !== null ? (
        <FormAlert>
          {formError}
          {isTaxIdConflict ? ` ${copy.organizationForm.duplicateTaxIdHelp}` : null}
        </FormAlert>
      ) : null}

      <Section title={copy.organizationForm.sectionIdentity}>
        <Field
          id="organization-name"
          label={copy.organizationForm.name}
          error={messageFor('name')}
        >
          <input
            id="organization-name"
            type="text"
            value={values.name}
            onChange={(event) => setValue('name', event.target.value)}
            placeholder={copy.organizationForm.namePlaceholder}
            aria-invalid={messageFor('name') !== undefined}
            className={`${INPUT_CLASS} ${borderFor('name')}`}
          />
        </Field>

        <Field
          id="organization-legal-name"
          label={copy.organizationForm.legalName}
          error={messageFor('legalName')}
        >
          <input
            id="organization-legal-name"
            type="text"
            value={values.legalName}
            onChange={(event) => setValue('legalName', event.target.value)}
            placeholder={copy.organizationForm.legalNamePlaceholder}
            aria-invalid={messageFor('legalName') !== undefined}
            className={`${INPUT_CLASS} ${borderFor('legalName')}`}
          />
        </Field>

        {/* Va deshabilitado y no solo de lectura, para que el tabulador no se
            detenga en un campo donde no hay nada que hacer. */}
        <Field
          id="organization-code"
          label={copy.organizationForm.code}
          help={copy.organizationForm.codeHelp}
        >
          <input
            id="organization-code"
            type="text"
            value={code}
            disabled
            readOnly
            placeholder={copy.organizationForm.codePending}
            className={`${INPUT_CLASS} border-border text-text-muted font-mono disabled:cursor-not-allowed`}
          />
        </Field>
      </Section>

      <Section title={copy.organizationForm.sectionLocation}>
        <div>
          <label htmlFor="organization-country" className="block text-sm font-medium">
            {copy.organizationForm.country}
          </label>
          <CountrySelect
            id="organization-country"
            value={values.countryCode}
            options={countries}
            onChange={changeCountry}
          />
        </div>

        <Field
          id="organization-tax-id"
          label={country?.taxIdLabel ?? copy.organizationForm.taxId}
          error={messageFor('taxId')}
        >
          <input
            id="organization-tax-id"
            type="text"
            value={values.taxId}
            onChange={(event) => setValue('taxId', event.target.value)}
            aria-invalid={messageFor('taxId') !== undefined}
            className={`${INPUT_CLASS} ${borderFor('taxId')}`}
          />
        </Field>

        <Field
          id="organization-currency"
          label={copy.organizationForm.currency}
          help={copy.organizationForm.currencyHelp}
        >
          <Select
            id="organization-currency"
            value={values.baseCurrencyCode}
            onChange={(next) => setValue('baseCurrencyCode', next)}
            disabled={isEditing}
          >
            {currencies.map((option) => (
              <option key={option.code} value={option.code}>
                {option.code} · {option.name}
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      <Section title={copy.organizationForm.sectionContact}>
        <Field
          id="organization-email"
          label={copy.organizationForm.email}
          error={messageFor('email')}
        >
          <input
            id="organization-email"
            type="email"
            value={values.email}
            onChange={(event) => setValue('email', event.target.value)}
            aria-invalid={messageFor('email') !== undefined}
            className={`${INPUT_CLASS} ${borderFor('email')}`}
          />
        </Field>

        {/* El prefijo no es un campo que se escriba: es una consecuencia del
            país, así que se muestra fijo y cambia con él. */}
        <Field
          id="organization-phone"
          label={copy.organizationForm.phone}
          help={`${copy.organizationForm.phoneHelp} ${phonePrefix} ${country?.phoneExample ?? ''}`.trim()}
          error={messageFor('phone')}
        >
          <PhoneField
            id="organization-phone"
            prefix={phonePrefix}
            value={values.phoneNumber}
            onChange={setPhoneNumber}
            placeholder={country?.phoneExample}
            /* La longitud del país, más los separadores que pone la máscara.
               Sin plantilla declarada no hay tope que imponer. */
            maxLength={phoneMask === '' ? undefined : phoneMask.length}
            hasError={messageFor('phone') !== undefined}
          />
        </Field>

        <Field
          id="organization-address"
          label={copy.organizationForm.address}
          error={messageFor('address')}
        >
          <Textarea
            id="organization-address"
            value={values.address}
            onChange={(next) => setValue('address', next)}
            hasError={messageFor('address') !== undefined}
          />
        </Field>
      </Section>

      <div className="flex justify-end gap-2">
        <Link
          href={ORGANIZATIONS_PATH}
          aria-disabled={submit.isPending}
          className={buttonClass({
            variant: 'secondary',
            size: 'md',
            className: submit.isPending ? 'pointer-events-none opacity-60' : '',
          })}
        >
          {copy.organizationForm.cancel}
        </Link>
        <ActionButton
          type="submit"
          isPending={submit.isPending}
          pendingLabel={copy.feedback.saving}
          className="h-10 px-4"
        >
          {isEditing ? copy.organizationForm.save : copy.organizationForm.submit}
        </ActionButton>
      </div>
    </form>
  );
}

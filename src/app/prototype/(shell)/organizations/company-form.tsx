'use client';

/**
 * Formulario de empresa, compartido por el alta y la edición.
 *
 * Una sola columna, agrupada en secciones con título, con la ayuda de cada
 * campo debajo del campo. Un formulario de dos columnas obliga a la vista a
 * zigzaguear, se cometen más errores y en móvil se rompe igual.
 *
 * El país manda sobre tres cosas: cómo se llama el número de contribuyente,
 * cuál es el prefijo telefónico y qué moneda se propone. Cambiar el país las
 * cambia las tres, porque son consecuencias suyas y no decisiones aparte.
 *
 * No pide zona horaria: todo instante se guarda en tiempo universal coordinado
 * y se presenta después en la zona de quien mira.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ActionButton, useAsyncAction } from '../../ui/action-button';
import { DuplicateTaxIdError, useCompanyStore, type CompanyInput } from '../../company-store';
import { useCopy } from '@/lib/i18n';
import { CountrySelect } from '../../ui/country-select';
import { buttonClass } from '../../ui/button';
import { Field, INPUT_CLASS, Section, Select, Textarea } from '../../ui/form';
import { FormAlert } from '../../ui/form-alert';
import { countryOptions, currencyOptions, findCountry } from '../../fake-data';
import { buildCompanyCode } from '../../company-code';
import { PhoneField } from '../../ui/phone-field';
import { applyPhoneMask, digitsOf, isPhoneComplete } from '../../phone';

const COMPANIES_PATH = '/prototype/organizations';

type FormValues = {
  name: string;
  legalName: string;
  countryCode: string;
  currency: string;
  taxId: string;
  phoneNumber: string;
  email: string;
  address: string;
};

type FieldName = 'name' | 'legalName' | 'taxId' | 'phoneNumber';

export function CompanyForm({
  companyId,
  assignedCode,
  initialValues,
}: {
  readonly companyId?: string;
  /** El código que ya tiene la empresa. Solo llega al editar; no se toca. */
  readonly assignedCode?: string;
  readonly initialValues?: Partial<FormValues>;
}): React.ReactElement {
  const copy = useCopy();

  const router = useRouter();
  const { companies, createCompany, updateCompany, isTaxIdTaken } = useCompanyStore();
  const submit = useAsyncAction();
  const isEditing = companyId !== undefined;

  const firstCountry = countryOptions[0];
  const [values, setValues] = useState<FormValues>({
    name: initialValues?.name ?? '',
    legalName: initialValues?.legalName ?? '',
    countryCode: initialValues?.countryCode ?? firstCountry?.code ?? '',
    currency: initialValues?.currency ?? firstCountry?.defaultCurrency ?? '',
    taxId: initialValues?.taxId ?? '',
    phoneNumber: initialValues?.phoneNumber ?? '',
    email: initialValues?.email ?? '',
    address: initialValues?.address ?? '',
  });
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  // El choque de identificador fiscal también se muestra arriba, no solo bajo
  // el campo: el formulario es largo y quien envía desde el final no vería un
  // error que queda fuera de la pantalla.
  const [formError, setFormError] = useState<string | null>(null);

  const country = findCountry(values.countryCode);
  const phonePrefix = country?.phonePrefix ?? '';
  const phoneMask = country?.phoneMask ?? '';

  // Al crear, el código todavía no existe: se muestra el que se va a asignar,
  // calculado contra las empresas que hay ahora. Al editar se muestra el que
  // ya tiene, que no cambia aunque cambie el nombre.
  const code = isEditing
    ? (assignedCode ?? '')
    : values.name.trim() === ''
      ? ''
      : buildCompanyCode(
          values.name,
          companies.map((company) => company.code),
        );

  function setValue(field: keyof FormValues, next: string): void {
    setValues((current) => ({ ...current, [field]: next }));
    // Corregir el identificador retira el aviso de choque en el acto. Dejarlo
    // hasta el siguiente envío haría que el formulario contradijera a lo que se
    // acaba de escribir.
    if (field === 'taxId') clearTaxIdError();
  }

  function clearTaxIdError(): void {
    setErrors((current) => {
      if (current.taxId === undefined) return current;
      const { taxId: _removed, ...rest } = current;
      return rest;
    });
    setFormError(null);
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
  }

  // Cambiar de país arrastra la moneda propuesta y vuelve a separar el teléfono
  // con la plantilla del país nuevo. El prefijo se deriva en cada renderizado,
  // así que no hay nada que arrastrar.
  function changeCountry(countryCode: string): void {
    // El choque es por país: cambiarlo invalida el aviso anterior.
    clearTaxIdError();
    const nextCountry = findCountry(countryCode);
    setValues((current) => ({
      ...current,
      countryCode,
      currency: nextCountry?.defaultCurrency ?? current.currency,
      phoneNumber: applyPhoneMask(digitsOf(current.phoneNumber), nextCountry?.phoneMask ?? ''),
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const nextErrors: Partial<Record<FieldName, string>> = {};
    if (values.name.trim() === '') nextErrors.name = copy.organizationForm.requiredField;
    if (values.legalName.trim() === '') {
      nextErrors.legalName = copy.organizationForm.requiredField;
    }
    // Un teléfono a medias no sirve para llamar. Vacío sí vale: el dato es
    // opcional, lo que no vale es dejarlo empezado.
    if (values.phoneNumber !== '' && !isPhoneComplete(values.phoneNumber, phoneMask)) {
      nextErrors.phoneNumber = copy.organizationForm.phoneIncomplete;
    }

    // Dos empresas del mismo país no pueden compartir identificador fiscal. Se
    // comprueba antes de enviar para dar el mensaje junto al campo; la regla de
    // verdad la impone el almacén, y más adelante la base de datos.
    if (isTaxIdTaken(values.countryCode, values.taxId, companyId)) {
      nextErrors.taxId = copy.organizationForm.duplicateTaxId;
    }

    setErrors(nextErrors);
    setFormError(nextErrors.taxId ?? null);
    if (Object.keys(nextErrors).length > 0) return;

    const input: CompanyInput = {
      name: values.name,
      legalName: values.legalName,
      countryCode: values.countryCode,
      currency: values.currency,
      taxId: values.taxId,
      email: values.email,
      phone: values.phoneNumber.trim() === '' ? '' : `${phonePrefix} ${values.phoneNumber}`,
      address: values.address,
    };

    // Se navega después de que la escritura termine, no antes. Adelantarse
    // llevaría a una lista que todavía no tiene el cambio.
    void submit.run(async () => {
      try {
        if (isEditing) {
          await updateCompany(companyId, input);
        } else {
          await createCompany(input);
        }
      } catch (error) {
        // Entre la comprobación de arriba y esta escritura cabe otra alta. Si
        // el almacén rechaza, el formulario se queda como está y lo dice.
        if (error instanceof DuplicateTaxIdError) {
          setErrors((current) => ({
            ...current,
            taxId: copy.organizationForm.duplicateTaxId,
          }));
          setFormError(copy.organizationForm.duplicateTaxId);
          return;
        }
        throw error;
      }
      router.push(COMPANIES_PATH as never);
    });
  }

  function borderFor(field: FieldName): string {
    return errors[field] !== undefined ? 'border-danger' : 'border-border';
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError !== null ? (
        <FormAlert>
          {formError} {copy.organizationForm.duplicateTaxIdHelp}
        </FormAlert>
      ) : null}

      <Section title={copy.organizationForm.sectionIdentity}>
        <Field id="company-name" label={copy.organizationForm.name} error={errors.name}>
          <input
            id="company-name"
            type="text"
            value={values.name}
            onChange={(event) => setValue('name', event.target.value)}
            placeholder={copy.organizationForm.namePlaceholder}
            aria-invalid={errors.name !== undefined}
            className={`${INPUT_CLASS} ${borderFor('name')}`}
          />
        </Field>

        <Field
          id="company-legal-name"
          label={copy.organizationForm.legalName}
          error={errors.legalName}
        >
          <input
            id="company-legal-name"
            type="text"
            value={values.legalName}
            onChange={(event) => setValue('legalName', event.target.value)}
            placeholder={copy.organizationForm.legalNamePlaceholder}
            aria-invalid={errors.legalName !== undefined}
            className={`${INPUT_CLASS} ${borderFor('legalName')}`}
          />
        </Field>

        {/* El código no se escribe: lo asigna el sistema. Se muestra igual
            porque es el que va a encabezar cada documento, y quien crea la
            empresa tiene derecho a verlo antes de confirmar. Va deshabilitado y
            no solo de lectura, para que el tabulador no se detenga en un campo
            donde no hay nada que hacer. */}
        <Field
          id="company-code"
          label={copy.organizationForm.code}
          help={copy.organizationForm.codeHelp}
        >
          <input
            id="company-code"
            type="text"
            value={code}
            disabled
            placeholder={copy.organizationForm.codePending}
            className={`${INPUT_CLASS} border-border text-text-muted font-mono disabled:cursor-not-allowed`}
          />
        </Field>
      </Section>

      <Section title={copy.organizationForm.sectionLocation}>
        <div>
          <label htmlFor="company-country" className="block text-sm font-medium">
            {copy.organizationForm.country}
          </label>
          <CountrySelect
            id="company-country"
            value={values.countryCode}
            options={countryOptions}
            onChange={changeCountry}
          />
        </div>

        <Field
          id="company-tax-id"
          label={country?.taxIdLabel ?? copy.organizationForm.taxId}
          error={errors.taxId}
        >
          <input
            id="company-tax-id"
            type="text"
            value={values.taxId}
            onChange={(event) => setValue('taxId', event.target.value)}
            aria-invalid={errors.taxId !== undefined}
            className={`${INPUT_CLASS} ${borderFor('taxId')}`}
          />
        </Field>

        <Field
          id="company-currency"
          label={copy.organizationForm.currency}
          help={copy.organizationForm.currencyHelp}
        >
          <Select
            id="company-currency"
            value={values.currency}
            onChange={(next) => setValue('currency', next)}
          >
            {currencyOptions.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code} · {currency.name}
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      <Section title={copy.organizationForm.sectionContact}>
        <Field id="company-email" label={copy.organizationForm.email}>
          <input
            id="company-email"
            type="email"
            value={values.email}
            onChange={(event) => setValue('email', event.target.value)}
            className={`${INPUT_CLASS} border-border`}
          />
        </Field>

        {/* El prefijo no es un campo que se escriba: es una consecuencia del
            país, así que se muestra fijo y cambia con él. */}
        <Field
          id="company-phone"
          label={copy.organizationForm.phone}
          help={`${copy.organizationForm.phoneHelp} ${phonePrefix} ${country?.phoneExample ?? ''}`}
          error={errors.phoneNumber}
        >
          <PhoneField
            id="company-phone"
            prefix={phonePrefix}
            value={values.phoneNumber}
            onChange={setPhoneNumber}
            placeholder={country?.phoneExample}
            /* La longitud del país, más los separadores que pone la máscara. */
            maxLength={phoneMask.length}
            hasError={errors.phoneNumber !== undefined}
          />
        </Field>

        <Field id="company-address" label={copy.organizationForm.address}>
          <Textarea
            id="company-address"
            value={values.address}
            onChange={(next) => setValue('address', next)}
          />
        </Field>
      </Section>

      <div className="flex justify-end gap-2">
        <Link
          href={COMPANIES_PATH as never}
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

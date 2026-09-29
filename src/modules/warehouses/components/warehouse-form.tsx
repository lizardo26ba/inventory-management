'use client';

/**
 * Formulario de almacén, compartido por el alta y la edición.
 *
 * Misma forma que el de empresa: una columna, secciones con título y la ayuda
 * debajo de cada campo. Las piezas salen de `@/components/ui/form`.
 *
 * El país propone la zona horaria: cambiar el país la cambia a la primera del
 * país nuevo, porque una zona de otro país sería un dato incoherente. La zona es
 * la del sitio físico, no la de la empresa: el corte diario de existencias de un
 * almacén en otro país no ocurre a la medianoche de la oficina. RN-014, RN-021.
 *
 * El código lo escribe la persona y no cambia una vez creado (RN-090, RN-091).
 * Al editar se enseña deshabilitado, y no viaja: el esquema de edición no lo
 * admite.
 *
 * Al editar viaja la versión que tenía el almacén al abrir la pantalla. Si otra
 * persona guardó mientras tanto, el servidor rechaza y esta pantalla lo dice en
 * lugar de pisar su trabajo.
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
import { useCopy } from '@/lib/i18n';

import { createWarehouse, updateWarehouse } from '../actions';
import { WAREHOUSES_PATH } from '../routes';
import {
  WAREHOUSE_CODE_MAX_LENGTH,
  createWarehouseSchema,
  updateWarehouseSchema,
} from '../schema';
import { timeZoneCity } from '../service';
import type { WarehouseCountryOption } from '../types';

type FieldErrors = Readonly<Record<string, string>>;

export type WarehouseFormValues = {
  readonly code: string;
  readonly name: string;
  readonly address: string;
  readonly countryCode: string;
  readonly timeZone: string;
};

/** Lo que hace falta para editar, y que al crear todavía no existe. */
export type WarehouseBeingEdited = {
  readonly id: string;
  readonly version: number;
  readonly values: WarehouseFormValues;
};

/**
 * El campo de cada clave de error, en el orden en que aparecen en pantalla. El
 * primero con error recibe el foco, para no obligar a buscarlo.
 */
const FIELD_IDS: readonly (readonly [string, string])[] = [
  ['code', 'warehouse-code'],
  ['name', 'warehouse-name'],
  ['countryCode', 'warehouse-country'],
  ['timeZone', 'warehouse-time-zone'],
  ['address', 'warehouse-address'],
];

function focusFirstInvalid(errors: FieldErrors): void {
  const first = FIELD_IDS.find(([field]) => errors[field] !== undefined);
  if (first !== undefined) document.getElementById(first[1])?.focus();
}

export function WarehouseForm({
  countries,
  defaultCountryCode,
  warehouse,
}: {
  readonly countries: readonly WarehouseCountryOption[];
  /** El país de la empresa, que es el que se propone al crear. */
  readonly defaultCountryCode: string;
  /** Presente solo al editar. Su ausencia es lo que significa "alta". */
  readonly warehouse?: WarehouseBeingEdited;
}): React.ReactElement {
  const copy = useCopy();
  const submit = useAsyncAction();
  const isEditing = warehouse !== undefined;

  const proposed =
    countries.find((candidate) => candidate.code === defaultCountryCode) ?? countries[0];
  const [values, setValues] = useState<WarehouseFormValues>(
    warehouse?.values ?? {
      code: '',
      name: '',
      address: '',
      countryCode: proposed?.code ?? '',
      timeZone: proposed?.timeZones[0] ?? '',
    },
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const timeZones =
    countries.find((candidate) => candidate.code === values.countryCode)?.timeZones ?? [];

  function messageFor(field: string): string | undefined {
    const key = fieldErrors[field];
    if (key === undefined) return undefined;
    return copy.fieldErrors[key as keyof typeof copy.fieldErrors] ?? copy.errors.generic;
  }

  function setValue(field: keyof WarehouseFormValues, next: string): void {
    setValues((current) => ({ ...current, [field]: next }));
    // Corregir un campo retira su aviso en el acto.
    setFieldErrors((current) => {
      if (current[field] === undefined) return current;
      const { [field]: _removed, ...rest } = current;
      return rest;
    });
    setFormError(null);
  }

  function changeCountry(countryCode: string): void {
    const next = countries.find((candidate) => candidate.code === countryCode);
    setValues((current) => ({ ...current, countryCode, timeZone: next?.timeZones[0] ?? '' }));
    setFieldErrors(({ countryCode: _country, timeZone: _zone, ...rest }) => rest);
  }

  function showErrors(errors: FieldErrors): void {
    setFieldErrors(errors);
    focusFirstInvalid(errors);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setFormError(null);

    // El mismo esquema que usa el servidor, para que el aviso llegue sin esperar
    // la vuelta a la red. El que decide sigue siendo el de allá.
    // Al editar, el código no viaja: el esquema de edición es estricto y lo
    // rechazaría.
    const { code: _code, ...editable } = values;
    const parsed = isEditing
      ? updateWarehouseSchema.safeParse({
          ...editable,
          id: warehouse.id,
          version: warehouse.version,
        })
      : createWarehouseSchema.safeParse(values);

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path.join('.');
        if (field !== '' && next[field] === undefined) next[field] = issue.message;
      }
      showErrors(next);
      return;
    }
    setFieldErrors({});

    void submit.run(async () => {
      const result = isEditing
        ? await updateWarehouse(parsed.data)
        : await createWarehouse(parsed.data);
      // Cuando sale bien, la acción navega y este código no se alcanza.
      if (result.ok) return;

      if (result.error.fieldErrors !== undefined) {
        showErrors(result.error.fieldErrors);
        return;
      }

      // Lo escrito aquí se queda en pantalla para poder copiarlo antes de recargar.
      if (result.error.code === 'STALE_VERSION') {
        setFormError(copy.errors.staleVersion);
        return;
      }

      setFormError(
        result.error.code === 'NOT_AUTHORIZED'
          ? copy.errors.notAuthorized
          : result.error.code === 'NOT_FOUND'
            ? copy.errors.notFound
            : copy.errors.generic,
      );
    });
  }

  function borderFor(field: string): string {
    return inputBorderClass(messageFor(field) !== undefined);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError !== null ? <FormAlert>{formError}</FormAlert> : null}

      <Section title={copy.warehouseForm.sectionIdentity}>
        <Field
          id="warehouse-code"
          label={copy.warehouseForm.code}
          help={isEditing ? copy.warehouseForm.codeFixed : copy.warehouseForm.codeHelp}
          error={messageFor('code')}
        >
          {/* Se escribe en mayúsculas mientras se teclea, que es como se va a
              guardar: lo que se ve es lo que queda. */}
          <input
            id="warehouse-code"
            type="text"
            value={values.code}
            onChange={(event) => setValue('code', event.target.value.toUpperCase())}
            disabled={isEditing}
            maxLength={WAREHOUSE_CODE_MAX_LENGTH}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={messageFor('code') !== undefined}
            className={`${INPUT_CLASS} ${borderFor('code')} font-mono uppercase disabled:cursor-not-allowed disabled:opacity-70`}
          />
        </Field>

        <Field id="warehouse-name" label={copy.warehouseForm.name} error={messageFor('name')}>
          <input
            id="warehouse-name"
            type="text"
            value={values.name}
            onChange={(event) => setValue('name', event.target.value)}
            placeholder={copy.warehouseForm.namePlaceholder}
            aria-invalid={messageFor('name') !== undefined}
            className={`${INPUT_CLASS} ${borderFor('name')}`}
          />
        </Field>
      </Section>

      <Section title={copy.warehouseForm.sectionLocation}>
        <Field
          id="warehouse-country"
          label={copy.warehouseForm.country}
          help={copy.warehouseForm.countryHelp}
          error={messageFor('countryCode')}
        >
          <CountrySelect
            id="warehouse-country"
            value={values.countryCode}
            options={countries}
            onChange={changeCountry}
          />
        </Field>

        <Field
          id="warehouse-time-zone"
          label={copy.warehouseForm.timeZone}
          help={copy.warehouseForm.timeZoneHelp}
          error={messageFor('timeZone')}
        >
          <Select
            id="warehouse-time-zone"
            value={values.timeZone}
            onChange={(next) => setValue('timeZone', next)}
            hasError={messageFor('timeZone') !== undefined}
          >
            {timeZones.map((zone) => (
              <option key={zone} value={zone}>
                {timeZoneCity(zone)}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          id="warehouse-address"
          label={copy.warehouseForm.address}
          error={messageFor('address')}
        >
          <Textarea
            id="warehouse-address"
            value={values.address}
            onChange={(next) => setValue('address', next)}
            hasError={messageFor('address') !== undefined}
          />
        </Field>
      </Section>

      <div className="flex justify-end gap-2">
        <Link
          href={WAREHOUSES_PATH}
          aria-disabled={submit.isPending}
          className={buttonClass({
            variant: 'secondary',
            size: 'md',
            className: submit.isPending ? 'pointer-events-none opacity-60' : '',
          })}
        >
          {copy.warehouseForm.cancel}
        </Link>
        <ActionButton
          type="submit"
          isPending={submit.isPending}
          pendingLabel={copy.feedback.saving}
          className="h-10 px-4"
        >
          {isEditing ? copy.warehouseForm.save : copy.warehouseForm.submit}
        </ActionButton>
      </div>
    </form>
  );
}

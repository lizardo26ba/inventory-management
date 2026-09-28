'use client';

/**
 * Formulario de almacén, compartido por el alta y la edición.
 *
 * Misma forma que el de empresa: una columna, secciones con título y la ayuda
 * debajo de cada campo.
 *
 * El país propone la zona horaria, igual que en la empresa propone la moneda:
 * cambiar el país cambia la zona a la primera del país nuevo, porque una zona de
 * otro país sería un dato incoherente. Dentro de un país con varias zonas, como
 * México, se elige.
 *
 * La zona se pide aquí y no en la empresa porque es la del sitio físico: el
 * corte diario de existencias de un almacén en Cancún no ocurre a la medianoche
 * de Guatemala. RN-014, RN-021.
 *
 * El código lo escribe la persona y no el sistema, a diferencia del de empresa:
 * es el que se lee en etiquetas y documentos, y tiene que ser reconocible para
 * quien trabaja en ese almacén. Una vez creado no cambia. RN-090, RN-091.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useCopy } from '@/lib/i18n';
import { useCompanyStore } from '../../company-store';
import { countryOptions, findCountry } from '../../fake-data';
import { ActionButton, useAsyncAction } from '../../ui/action-button';
import { buttonClass } from '../../ui/button';
import { CountrySelect } from '../../ui/country-select';
import { Field, INPUT_CLASS, Section, Select, Textarea } from '../../ui/form';
import {
  DuplicateWarehouseCodeError,
  normalizeWarehouseCode,
  useWarehouseStore,
} from '../../warehouse-store';
import { WAREHOUSES_PATH } from './paths';

/**
 * Letras, dígitos y guiones, de dos a diez. Corto para caber en una etiqueta y
 * sin espacios para poder escribirse en un lector de códigos.
 */
const WAREHOUSE_CODE_PATTERN = /^[A-Z0-9-]{2,10}$/;
const WAREHOUSE_CODE_MAX_LENGTH = 10;

type FormValues = {
  code: string;
  name: string;
  address: string;
  countryCode: string;
  timeZone: string;
};

type FieldName = 'code' | 'name';

export function WarehouseForm({
  warehouseId,
  initialValues,
}: {
  readonly warehouseId?: string;
  readonly initialValues?: FormValues;
}): React.ReactElement {
  const copy = useCopy();
  const router = useRouter();
  const { activeCompany } = useCompanyStore();
  const { createWarehouse, updateWarehouse, isCodeTaken } = useWarehouseStore();
  const submit = useAsyncAction();
  const isEditing = warehouseId !== undefined;

  // Se propone el país de la empresa, que es el caso más común.
  const proposedCountry = findCountry(activeCompany?.countryCode ?? '') ?? countryOptions[0];
  const [values, setValues] = useState<FormValues>(
    initialValues ?? {
      code: '',
      name: '',
      address: '',
      countryCode: proposedCountry?.code ?? '',
      timeZone: proposedCountry?.timeZones[0]?.id ?? '',
    },
  );
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});

  const timeZones = findCountry(values.countryCode)?.timeZones ?? [];

  function setValue(field: keyof FormValues, next: string): void {
    setValues((current) => ({ ...current, [field]: next }));
    if (field === 'code' || field === 'name') {
      setErrors((current) => {
        if (current[field] === undefined) return current;
        const { [field]: _removed, ...rest } = current;
        return rest;
      });
    }
  }

  function changeCountry(countryCode: string): void {
    setValues((current) => ({
      ...current,
      countryCode,
      timeZone: findCountry(countryCode)?.timeZones[0]?.id ?? '',
    }));
  }

  /**
   * Los errores se declaran en el orden de los campos en pantalla, porque el
   * primero es el que recibe el foco.
   */
  function validate(): Partial<Record<FieldName, string>> {
    const found: Partial<Record<FieldName, string>> = {};
    if (!isEditing) {
      const code = normalizeWarehouseCode(values.code);
      if (code === '') {
        found.code = copy.warehouseForm.requiredField;
      } else if (!WAREHOUSE_CODE_PATTERN.test(code)) {
        found.code = copy.warehouseForm.codeInvalid;
      } else if (isCodeTaken(code)) {
        found.code = copy.warehouseForm.duplicateCode;
      }
    }
    if (values.name.trim() === '') found.name = copy.warehouseForm.requiredField;
    return found;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const found = validate();
    setErrors(found);
    const [firstInvalid] = Object.keys(found);
    if (firstInvalid !== undefined) {
      // El primer campo con error recibe el foco, para no obligar a buscarlo.
      document.getElementById(`warehouse-${firstInvalid}`)?.focus();
      return;
    }

    void submit.run(async () => {
      try {
        if (isEditing) {
          await updateWarehouse(warehouseId, values);
        } else {
          await createWarehouse(values);
        }
      } catch (error) {
        // Entre la comprobación y la escritura cabe otra alta con el mismo
        // código. Si el almacén en memoria rechaza, el formulario lo dice.
        if (error instanceof DuplicateWarehouseCodeError) {
          setErrors((current) => ({ ...current, code: copy.warehouseForm.duplicateCode }));
          return;
        }
        throw error;
      }
      router.push(WAREHOUSES_PATH as never);
    });
  }

  function borderFor(field: FieldName): string {
    return errors[field] !== undefined ? 'border-danger' : 'border-border';
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <Section title={copy.warehouseForm.sectionIdentity}>
        <Field
          id="warehouse-code"
          label={copy.warehouseForm.code}
          help={isEditing ? copy.warehouseForm.codeFixed : copy.warehouseForm.codeHelp}
          error={errors.code}
        >
          {/* Se escribe en mayúsculas mientras se teclea, que es como se va a
              guardar: así lo que se ve es lo que queda. Al editar va
              deshabilitado, para que el tabulador no se detenga donde no hay
              nada que hacer. */}
          <input
            id="warehouse-code"
            type="text"
            value={values.code}
            onChange={(event) => setValue('code', event.target.value.toUpperCase())}
            disabled={isEditing}
            maxLength={WAREHOUSE_CODE_MAX_LENGTH}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={errors.code !== undefined}
            className={`${INPUT_CLASS} ${borderFor('code')} font-mono uppercase disabled:cursor-not-allowed disabled:opacity-70`}
          />
        </Field>

        <Field id="warehouse-name" label={copy.warehouseForm.name} error={errors.name}>
          <input
            id="warehouse-name"
            type="text"
            value={values.name}
            onChange={(event) => setValue('name', event.target.value)}
            placeholder={copy.warehouseForm.namePlaceholder}
            aria-invalid={errors.name !== undefined}
            className={`${INPUT_CLASS} ${borderFor('name')}`}
          />
        </Field>
      </Section>

      <Section title={copy.warehouseForm.sectionLocation}>
        <Field
          id="warehouse-country"
          label={copy.warehouseForm.country}
          help={copy.warehouseForm.countryHelp}
        >
          <CountrySelect
            id="warehouse-country"
            value={values.countryCode}
            options={countryOptions}
            onChange={changeCountry}
          />
        </Field>

        <Field
          id="warehouse-time-zone"
          label={copy.warehouseForm.timeZone}
          help={copy.warehouseForm.timeZoneHelp}
        >
          <Select
            id="warehouse-time-zone"
            value={values.timeZone}
            onChange={(next) => setValue('timeZone', next)}
          >
            {timeZones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="warehouse-address" label={copy.warehouseForm.address}>
          <Textarea
            id="warehouse-address"
            value={values.address}
            onChange={(next) => setValue('address', next)}
          />
        </Field>
      </Section>

      <div className="flex justify-end gap-2">
        <Link
          href={WAREHOUSES_PATH as never}
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

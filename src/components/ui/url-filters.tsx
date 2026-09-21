'use client';

/**
 * Filtros de una lista que viven en la dirección.
 *
 * Nacen en la bitácora, donde los desplegables y las fechas estaban escritos a
 * mano dentro de la vista. Aquí viven una vez, con la etiqueta encima y el mismo
 * alto, y cada uno escribe su propio parámetro. Igual que el buscador, quien
 * filtra de verdad es el servidor: el filtro solo cambia la dirección.
 *
 * Todo filtro que cambia borra lo que dependía del resultado anterior, como la
 * posición en la lista o el detalle abierto encima. Qué parámetros son esos lo
 * dice la pantalla, porque cada una pagina y abre cosas a su manera.
 *
 * Los de texto son de coincidencia exacta, no de búsqueda. Una búsqueda por
 * fragmento necesita un índice propio para no recorrer la tabla, y un correo o
 * un identificador se pegan enteros.
 */

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { SMALL_CONTROL_CLASS, Select } from './form';
import { useLoadingSource } from './table-loading';

const DEBOUNCE_MS = 300;

export type FilterOption = {
  readonly value: string;
  readonly label: string;
};

/** Escribe un parámetro y borra los que el cambio deja sin sentido. */
function useParamWriter(resetParams: readonly string[]): (key: string, value: string) => void {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === '') params.delete(key);
      else params.set(key, value);
      for (const reset of resetParams) params.delete(reset);

      const suffix = params.toString();
      router.replace((suffix === '' ? pathname : `${pathname}?${suffix}`) as never, {
        scroll: false,
      });
    },
    [router, pathname, searchParams, resetParams],
  );
}

function FilterField({
  id,
  label,
  className,
  children,
}: {
  readonly id: string;
  readonly label: string;
  /** Para el ancho, que lo decide el tipo de dato. */
  readonly className: string;
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-text-muted block text-xs font-medium">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

/** La fila de filtros. Se parte en varias líneas cuando no cabe. */
export function FilterBar({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  return <div className="flex w-full flex-wrap items-end gap-3">{children}</div>;
}

/** Desplegable de valores cerrados. La primera opción no filtra. */
export function SelectFilter({
  id,
  param,
  label,
  allLabel,
  options,
  resetParams,
}: {
  readonly id: string;
  readonly param: string;
  readonly label: string;
  readonly allLabel: string;
  readonly options: readonly FilterOption[];
  readonly resetParams: readonly string[];
}): React.ReactElement {
  const searchParams = useSearchParams();
  const write = useParamWriter(resetParams);

  return (
    <FilterField id={id} label={label} className="w-full sm:w-56">
      <Select
        id={id}
        size="sm"
        value={searchParams.get(param) ?? ''}
        onChange={(next) => write(param, next)}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </FilterField>
  );
}

/**
 * Un día del calendario. Llega como `AAAA-MM-DD` y así viaja: qué instante marca
 * el principio o el final de ese día lo decide quien consulta, con su zona.
 */
export function DateFilter({
  id,
  param,
  label,
  resetParams,
}: {
  readonly id: string;
  readonly param: string;
  readonly label: string;
  readonly resetParams: readonly string[];
}): React.ReactElement {
  const searchParams = useSearchParams();
  const write = useParamWriter(resetParams);

  return (
    <FilterField id={id} label={label} className="w-full sm:w-40">
      <input
        id={id}
        type="date"
        value={searchParams.get(param) ?? ''}
        onChange={(event) => write(param, event.target.value)}
        className={`${SMALL_CONTROL_CLASS} border-border`}
      />
    </FilterField>
  );
}

/**
 * Texto de coincidencia exacta.
 *
 * Escribe con retardo, como el buscador, porque cada pulsación sería una
 * navegación. Mientras lo escrito y la dirección no coinciden, se declara como
 * fuente de carga para que la barra de la tabla lo diga.
 */
export function TextFilter({
  id,
  param,
  label,
  placeholder,
  resetParams,
}: {
  readonly id: string;
  readonly param: string;
  readonly label: string;
  readonly placeholder: string;
  readonly resetParams: readonly string[];
}): React.ReactElement {
  const searchParams = useSearchParams();
  const write = useParamWriter(resetParams);

  const valueFromUrl = searchParams.get(param) ?? '';
  const [value, setValue] = useState(valueFromUrl);
  const isFirstRender = useRef(true);

  // Si la dirección cambia por otra vía, como el botón de atrás o el enlace de
  // limpiar, el campo tiene que seguirla.
  useEffect(() => {
    setValue(valueFromUrl);
  }, [valueFromUrl]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (value.trim() === valueFromUrl) return;

    const timer = window.setTimeout(() => write(param, value.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [value, valueFromUrl, param, write]);

  useLoadingSource(`filter-${param}`, value.trim() !== valueFromUrl);

  return (
    <FilterField id={id} label={label} className="w-full sm:w-56">
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className={`${SMALL_CONTROL_CLASS} border-border`}
      />
    </FilterField>
  );
}

/** Quita todos los filtros de una vez. No aparece si no hay ninguno puesto. */
export function ClearFiltersLink({
  params,
  label,
  resetParams,
}: {
  /** Los parámetros que son filtros. */
  readonly params: readonly string[];
  readonly label: string;
  readonly resetParams: readonly string[];
}): React.ReactElement | null {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const next = new URLSearchParams(searchParams.toString());
  if (!params.some((key) => next.has(key))) return null;

  for (const key of [...params, ...resetParams]) next.delete(key);
  const suffix = next.toString();

  return (
    <Link
      href={(suffix === '' ? pathname : `${pathname}?${suffix}`) as never}
      scroll={false}
      className="text-primary h-8 text-sm leading-8 hover:underline"
    >
      {label}
    </Link>
  );
}

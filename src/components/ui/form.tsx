/**
 * Piezas comunes de formulario.
 *
 * Están aquí y no dentro de cada formulario porque la etiqueta, la ayuda y el
 * error tienen que verse igual en todas las pantallas. Cuando cada formulario
 * llevaba su propia copia, dos altas del mismo sistema se veían distintas y
 * nadie se enteraba hasta abrirlas una al lado de la otra.
 *
 * No hay lógica de negocio: reciben el texto ya resuelto y lo colocan.
 */

import { IconChevronDown } from '@/components/ui/icons';

/**
 * El control de texto, sin separación superior.
 *
 * Se expone aparte porque hay controles que se envuelven en otra caja, y esa
 * caja es la que lleva la separación. Si la llevaran los dos, el campo quedaría
 * más abajo que sus vecinos.
 */
export const CONTROL_CLASS =
  'h-10 w-full rounded-control border bg-surface px-3 text-sm placeholder:text-text-muted';

/** El control de texto tal como va bajo una etiqueta. */
export const INPUT_CLASS = `mt-1.5 ${CONTROL_CLASS}`;

/** El borde del control según tenga error o no. */
export function inputBorderClass(hasError: boolean): string {
  return hasError ? 'border-danger' : 'border-border';
}

/**
 * Un bloque con título dentro de la tarjeta.
 *
 * Agrupar en secciones deja el formulario en una sola columna sin que parezca
 * una lista interminable de campos sueltos.
 */
export function Section({
  title,
  help,
  children,
}: {
  readonly title: string;
  readonly help?: string;
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="border-border bg-surface rounded-card border">
      <div className="border-border border-b px-5 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {help !== undefined ? <p className="text-text-muted mt-1 text-xs">{help}</p> : null}
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

/**
 * Etiqueta, control y una línea debajo.
 *
 * El error sustituye a la ayuda en lugar de sumarse: dos líneas de texto bajo un
 * campo que acaba de fallar compiten entre sí y se lee la que no importa.
 */
export function Field({
  id,
  label,
  help,
  error,
  children,
}: {
  readonly id: string;
  readonly label: string;
  readonly help?: string;
  readonly error?: string;
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {error !== undefined ? (
        <p id={`${id}-error`} className="text-danger mt-1.5 text-xs">
          {error}
        </p>
      ) : help !== undefined ? (
        <p id={`${id}-help`} className="text-text-muted mt-1.5 text-xs">
          {help}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Desplegable nativo con la flecha dibujada por el proyecto.
 *
 * La flecha del sistema cambia de forma en cada navegador y en cada sistema
 * operativo, así que el mismo formulario se veía distinto según la máquina. Se
 * oculta la nativa y se pinta la del proyecto, que es la misma del selector de
 * país.
 */
export function Select({
  id,
  value,
  onChange,
  hasError = false,
  disabled = false,
  children,
}: {
  readonly id: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly hasError?: boolean;
  /** Para un dato que existe pero ya no se puede cambiar. */
  readonly disabled?: boolean;
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="relative mt-1.5">
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={hasError}
        disabled={disabled}
        className={`${CONTROL_CLASS} ${inputBorderClass(hasError)} appearance-none pr-9 disabled:cursor-not-allowed disabled:opacity-70`}
      >
        {children}
      </select>
      <IconChevronDown className="text-text-muted pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2" />
    </div>
  );
}

/**
 * Campo de varias líneas.
 *
 * Comparte el borde, el fondo y la tipografía del campo de una línea, pero suelta
 * la altura fija: crece con las filas que se le pidan. El relleno vertical se
 * repone a mano porque el de una línea da por hecho que el texto va centrado.
 */
export function Textarea({
  id,
  value,
  onChange,
  rows = 3,
  hasError = false,
}: {
  readonly id: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly rows?: number;
  readonly hasError?: boolean;
}): React.ReactElement {
  return (
    <textarea
      id={id}
      rows={rows}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-invalid={hasError}
      className={`${CONTROL_CLASS} ${inputBorderClass(hasError)} mt-1.5 h-auto py-2`}
    />
  );
}

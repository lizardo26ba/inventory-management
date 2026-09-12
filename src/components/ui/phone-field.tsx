/**
 * Campo de teléfono con el prefijo del país delante.
 *
 * El prefijo no se escribe: es una consecuencia del país elegido, así que se
 * muestra fijo, no recibe foco y cambia cuando cambia el país. Quien teclea solo
 * pone la parte nacional, que es como se dicta un número en voz alta.
 *
 * La caja de fuera lleva el borde y la altura, y el campo de dentro es
 * transparente. Así el prefijo y el número parecen un solo control, que es lo
 * que son.
 *
 * Aquí no hay máscara ni validación. El formulario decide cómo se agrupan los
 * dígitos de cada país y entrega el valor ya formateado.
 */

export function PhoneField({
  id,
  prefix,
  value,
  onChange,
  placeholder,
  maxLength,
  hasError = false,
}: {
  readonly id: string;
  readonly prefix: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly placeholder?: string;
  readonly maxLength?: number;
  readonly hasError?: boolean;
}): React.ReactElement {
  return (
    <div
      className={`bg-surface rounded-control mt-1.5 flex h-10 items-center overflow-hidden border ${
        hasError ? 'border-danger' : 'border-border'
      }`}
    >
      <span className="border-border bg-surface-muted text-text-muted flex h-full items-center border-r px-3 text-sm tabular-nums">
        {prefix}
      </span>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={hasError}
        maxLength={maxLength}
        className="placeholder:text-text-muted h-full min-w-0 flex-1 bg-transparent px-3 text-sm tabular-nums"
      />
    </div>
  );
}

/**
 * El aspecto de un botón, en un solo sitio.
 *
 * No es un componente sino las clases, porque un botón unas veces es `<button>`
 * y otras es un enlace: la acción de una cabecera navega, la de un formulario
 * envía. Forzar un componente obligaría a envolver el enlace o a duplicar el
 * estilo, que es justo lo que se quiere evitar.
 *
 * Tres variantes y dos tamaños. Más variantes significaría que el diseño todavía
 * no está decidido, no que haga falta más flexibilidad.
 */

const BASE_CLASS =
  'rounded-control inline-flex items-center justify-center gap-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60';

const VARIANT_CLASS = {
  primary: 'bg-primary text-text-inverted hover:bg-primary-hover',
  secondary: 'border border-border hover:bg-surface-muted',
  danger: 'bg-danger text-text-inverted hover:opacity-90',
} as const;

/** El pequeño es el de las cabeceras y las filas; el mediano, el de un formulario. */
const SIZE_CLASS = {
  sm: 'h-9 px-3',
  md: 'h-10 px-4',
} as const;

export type ButtonVariant = keyof typeof VARIANT_CLASS;
export type ButtonSize = keyof typeof SIZE_CLASS;

export function buttonClass(options?: {
  readonly variant?: ButtonVariant;
  /** Se omite cuando quien llama pone su propia altura. */
  readonly size?: ButtonSize;
  readonly className?: string;
}): string {
  const variant = VARIANT_CLASS[options?.variant ?? 'primary'];
  const size = options?.size === undefined ? '' : SIZE_CLASS[options.size];

  return [BASE_CLASS, variant, size, options?.className ?? '']
    .filter((part) => part !== '')
    .join(' ');
}

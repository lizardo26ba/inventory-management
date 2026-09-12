/**
 * Aviso enmarcado.
 *
 * Para lo que hay que leer antes de seguir: una consecuencia que no se ve en el
 * control que la produce, o una advertencia sobre el alcance de algo que se está
 * a punto de conceder.
 *
 * No es el aviso de error de un formulario. Ese habla de algo que ya falló y
 * lleva su propio color; esto habla de algo que todavía no ha pasado.
 *
 * No lleva icono. El marco y el color ya lo separan del texto de alrededor, y un
 * icono más en una pantalla llena de controles compite con ellos.
 */

const TONE_CLASS = {
  warning: 'border-warning bg-warning-soft',
  info: 'border-border bg-surface-muted',
} as const;

export type NoticeTone = keyof typeof TONE_CLASS;

export function Notice({
  tone = 'warning',
  children,
}: {
  readonly tone?: NoticeTone;
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <p className={`rounded-control border px-3 py-2 text-sm ${TONE_CLASS[tone]}`}>{children}</p>
  );
}

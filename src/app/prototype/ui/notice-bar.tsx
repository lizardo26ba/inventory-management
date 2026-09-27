/**
 * Barra de aviso a lo ancho de la página, bajo el encabezado.
 *
 * Para lo que tiene que estar a la vista todo el rato mientras se trabaja, no
 * solo en una pantalla: en qué situación está la sesión. No es un mensaje que se
 * lee y se descarta, así que no se puede cerrar.
 *
 * Es otra pieza que `Notice`. Aquel es un recuadro dentro del contenido, junto al
 * control del que habla; esta es del marco y habla de la página entera.
 *
 * El tono de peligro es para cuando lo que se hace ahí tiene un alcance que no
 * es el habitual, como trabajar con privilegio elevado. El de advertencia, para
 * lo demás.
 */

const TONE_CLASS = {
  warning: 'bg-warning-soft text-text-muted',
  danger: 'bg-danger-soft text-text',
} as const;

export type NoticeBarTone = keyof typeof TONE_CLASS;

export function NoticeBar({
  tone = 'warning',
  icon,
  children,
  action,
}: {
  readonly tone?: NoticeBarTone;
  /** Solo cuando el aviso tiene que reconocerse de un vistazo entre pantallas. */
  readonly icon?: React.ReactNode;
  readonly children: React.ReactNode;
  /** Lo que se puede hacer al respecto, si hay algo. */
  readonly action?: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      className={`border-border flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b px-4 py-1.5 text-center text-xs ${TONE_CLASS[tone]}`}
    >
      <p className="flex items-center gap-2">
        {icon}
        <span>{children}</span>
      </p>
      {action}
    </div>
  );
}

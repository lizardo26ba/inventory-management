/**
 * Indicador de operación en curso.
 *
 * Va dentro del control que disparó la operación, no en una esquina de la
 * pantalla: quien pulsó un botón mira ese botón, y ahí es donde espera la
 * respuesta.
 *
 * No lleva texto propio ni rol de imagen. El control que lo contiene es el que
 * se anuncia como ocupado con aria-busy, así que repetirlo aquí haría que el
 * lector de pantalla dijera dos veces lo mismo.
 *
 * El atributo data-motion lo exime de la regla de movimiento reducido: un
 * indicador de carga detenido no informa de nada. En su lugar gira más despacio.
 */

export function Spinner({
  className = 'h-4 w-4',
}: {
  readonly className?: string;
}): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      data-motion="essential"
      className={`animate-spin ${className}`}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

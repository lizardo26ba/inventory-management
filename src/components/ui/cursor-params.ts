/**
 * Los parámetros de la dirección que guardan la posición en una lista por cursor.
 *
 * Viven aquí y no junto al pie de paginación, que es de cliente, por una razón que
 * no se ve leyendo el código: lo que exporta un módulo de cliente deja de ser un
 * dato cuando lo mira el servidor, y pasa a ser una referencia a lo que se
 * resolverá en el navegador. Una pantalla de servidor que recorriera esta lista
 * falla en ejecución con los tipos, el linter y la compilación en verde.
 *
 * Es el mismo motivo por el que las secciones del menú viven fuera del marco. Ver
 * `src/components/layout/navigation.ts`.
 */

export const CURSOR_PARAMS = {
  /** Mostrar lo anterior a esta fila. */
  older: 'older',
  /** Mostrar lo posterior a esta fila. */
  newer: 'newer',
} as const;

export const CURSOR_PARAM_KEYS = [CURSOR_PARAMS.older, CURSOR_PARAMS.newer] as const;

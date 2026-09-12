/**
 * Latencia simulada del prototipo.
 *
 * Ninguna pantalla de aquí habla con una base de datos, así que toda operación
 * terminaría antes de pintarse y los estados de carga nunca se verían. Eso es
 * justo lo que no se puede acordar a ciegas: un botón que gira medio segundo y
 * uno que no gira nunca son dos diseños distintos.
 *
 * Por eso cada operación que en la aplicación real cruzará la red espera este
 * tiempo. Al conectar las Server Actions, estas funciones desaparecen y la
 * espera pasa a ser la real.
 */

/** Lo que tarda una escritura: guardar, eliminar, cambiar un estado. */
const WRITE_ROUND_TRIP_MS = 700;

/** Lo que tarda una lectura: filtrar, ordenar, cambiar de página. */
const QUERY_ROUND_TRIP_MS = 450;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

export function simulateWrite(): Promise<void> {
  return wait(WRITE_ROUND_TRIP_MS);
}

export const SIMULATED_QUERY_MS = QUERY_ROUND_TRIP_MS;

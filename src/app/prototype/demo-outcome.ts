/**
 * Fallos fingidos, para poder ver en el prototipo los diálogos de error y de
 * advertencia. Los almacenes en memoria nunca fallan por sí solos.
 *
 * Son fijos y están en registros concretos, para que quien revise el diseño
 * sepa dónde provocarlos:
 *
 * - Eliminar la cuenta de Luis Herrera falla: error.
 * - Reactivar la cuenta de Jorge Lopez choca con un cambio de otra persona:
 *   advertencia.
 * - Suspender o reactivar la empresa Farmacia Los Altos falla: error.
 *
 * Todo lo demás sale bien.
 */

export type DemoOutcomeTone = 'error' | 'warning';

export class DemoOutcomeError extends Error {
  constructor(readonly tone: DemoOutcomeTone) {
    super(tone === 'error' ? 'Fallo fingido del prototipo' : 'Cambio fingido de otra persona');
  }
}

export const FAILING_USER_DELETE = 'u-02';
export const STALE_USER_TOGGLE = 'u-06';
export const FAILING_COMPANY_TOGGLE = 'c-03';

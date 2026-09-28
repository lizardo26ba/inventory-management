/**
 * Lo que tarda una escritura fingida en el catálogo: lo justo para ver el
 * estado de espera de un componente sin tener que adivinarlo.
 */
const SIMULATED_WRITE_MS = 1500;

export function waitForSimulatedWrite(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, SIMULATED_WRITE_MS));
}

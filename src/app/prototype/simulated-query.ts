'use client';

/**
 * Consulta simulada del prototipo.
 *
 * Vive aquí y no junto a la barra de progreso porque solo el prototipo la
 * necesita: en la aplicación real la espera es la de verdad, y la fuente de
 * carga la declara la transición que envuelve a la navegación.
 */

import { useEffect, useState } from 'react';

import { useLoadingSource } from './ui/table-loading';

import { SIMULATED_QUERY_MS } from './latency';

/**
 * La firma es el texto que resume los parámetros de la dirección. Cuando cambia,
 * la tabla se marca como cargando durante lo que tardaría la consulta real.
 */
export function useSimulatedQuery(signature: string): void {
  // Nace cargando, igual que una consulta real al abrir la pantalla.
  const [pendingSignature, setPendingSignature] = useState<string | null>(signature);
  const [seenSignature, setSeenSignature] = useState(signature);

  // La carga empieza en el mismo render en que cambia la firma, no en uno
  // posterior. El efecto solo decide cuándo termina.
  if (signature !== seenSignature) {
    setSeenSignature(signature);
    setPendingSignature(signature);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setPendingSignature(null), SIMULATED_QUERY_MS);
    return () => window.clearTimeout(timer);
  }, [signature]);

  useLoadingSource('query', pendingSignature !== null);
}

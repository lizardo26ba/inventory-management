import { EmptyState } from '../../ui/empty-state';

/**
 * Marcador de posición para las secciones que aún no se han diseñado.
 *
 * Existe para que la navegación completa se pueda recorrer sin topar con un
 * error, y para dejar visible qué falta. Se borra a medida que cada pantalla
 * real ocupa su ruta.
 *
 * Dibuja la pantalla de título y explicación con la pieza compartida en lugar de
 * a mano. Era la tercera copia de la misma marca visual en el proyecto, y esa es
 * la señal de que faltaba un componente.
 */
export default async function PlaceholderSectionPage({
  params,
}: {
  readonly params: Promise<{ readonly section: string }>;
}): Promise<React.ReactElement> {
  const { section } = await params;

  return (
    <EmptyState
      title="Not designed yet"
      message="This section is part of the system but has no screen yet. Sign in, the overview and the product catalog are the ones already drawn."
    >
      <span className="rounded-control bg-surface-muted text-text-muted px-2 py-0.5 font-mono text-xs">
        /{section}
      </span>
    </EmptyState>
  );
}

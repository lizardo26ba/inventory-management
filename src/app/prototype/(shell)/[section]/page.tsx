/**
 * Marcador de posición para las secciones que aún no se han diseñado.
 *
 * Existe para que la navegación completa se pueda recorrer sin topar con un
 * error, y para dejar visible qué falta. Se borra a medida que cada pantalla
 * real ocupa su ruta.
 */
export default async function PlaceholderSectionPage({
  params,
}: {
  readonly params: Promise<{ readonly section: string }>;
}): Promise<React.ReactElement> {
  const { section } = await params;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center py-24 text-center">
      <p className="rounded-control bg-surface-muted text-text-muted px-2 py-0.5 font-mono text-xs">
        /{section}
      </p>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">Not designed yet</h1>
      <p className="text-text-muted mt-2 text-sm">
        This section is part of the system but has no screen yet. Sign in, the overview and the
        product catalog are the ones already drawn.
      </p>
    </div>
  );
}

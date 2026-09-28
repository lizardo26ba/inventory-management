import { notFound } from 'next/navigation';

import { catalogEntryBySlug, type CatalogEntry } from './entries';

/**
 * Piezas para escribir una página del catálogo.
 *
 * Cada página es una cabecera y una serie de muestras. Una muestra enseña un
 * estado del componente y, debajo, cómo se usa. El uso va escrito a mano y
 * corto: es para recordar la forma de llamarlo, no para copiar un formulario
 * entero.
 */

/** La entrada de una página, o un 404 si el tramo de la dirección no existe. */
export function requireEntry(slug: string): CatalogEntry {
  const entry = catalogEntryBySlug(slug);
  if (entry === undefined) notFound();
  return entry;
}

export function CatalogHeader({ entry }: { readonly entry: CatalogEntry }): React.ReactElement {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold">{entry.title}</h1>
      <p className="text-text-muted mt-1 text-sm">{entry.summary}</p>
      <p className="text-text-muted mt-2 font-mono text-xs">
        {entry.files.map((file) => `src/components/ui/${file}`).join(' · ')}
      </p>
    </header>
  );
}

export function Specimen({
  title,
  description,
  usage,
  children,
}: {
  readonly title: string;
  readonly description?: string;
  readonly usage?: string;
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold">{title}</h2>
      {description !== undefined ? (
        <p className="text-text-muted mt-1 text-sm">{description}</p>
      ) : null}
      <div className="border-border bg-surface rounded-card mt-3 border">
        <div className="p-5">{children}</div>
        {usage !== undefined ? (
          <pre className="border-border bg-surface-muted text-text-muted overflow-x-auto border-t px-5 py-3 font-mono text-xs leading-relaxed">
            <code>{usage}</code>
          </pre>
        ) : null}
      </div>
    </section>
  );
}

/** Una fila de muestras que se parte cuando no cabe. */
export function SpecimenRow({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

import Link from 'next/link';

import { PENDING_FILES, entriesByGroup } from './entries';
import { CATALOG_PATH } from './paths';

export default function CatalogIndexPage(): React.ReactElement {
  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Catálogo de componentes</h1>
        <p className="text-text-muted mt-1 text-sm">
          Las piezas reales de <code className="font-mono">src/components/ui</code>, con datos
          inventados y en todos sus estados. El diseño se decide en el prototipo; aquí se ve lo
          que ya se decidió. Solo existe fuera de producción.
        </p>
      </header>

      {entriesByGroup().map(({ group, entries }) => (
        <section key={group} className="mb-8">
          <h2 className="text-base font-semibold">{group}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {entries.map((entry) => (
              <li key={entry.slug}>
                <Link
                  href={`${CATALOG_PATH}/${entry.slug}`}
                  className="border-border bg-surface rounded-card hover:border-border-strong block h-full border p-4"
                >
                  <span className="block text-sm font-semibold">{entry.title}</span>
                  <span className="text-text-muted mt-1 block text-sm">{entry.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {PENDING_FILES.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-base font-semibold">
            Todavía sin página ({PENDING_FILES.length})
          </h2>
          <p className="text-text-muted mt-1 text-sm">
            La lista solo debe encoger. Un componente nuevo en{' '}
            <code className="font-mono">src/components/ui</code> llega con su página o no pasa
            la prueba de cobertura.
          </p>
          <ul className="text-text-muted mt-3 flex flex-wrap gap-2 font-mono text-xs">
            {PENDING_FILES.map((file) => (
              <li key={file} className="bg-surface-muted rounded-control px-2 py-1">
                {file}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

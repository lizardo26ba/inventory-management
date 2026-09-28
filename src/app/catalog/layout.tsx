import type { Metadata } from 'next';

import { notFound } from 'next/navigation';

import { isProduction } from '@/lib/config/env.server';

import { CatalogShell } from './catalog-shell';
import { entriesByGroup } from './entries';

export const metadata: Metadata = {
  title: 'Catálogo de componentes · Inventario',
};

/**
 * Catálogo de los componentes compartidos.
 *
 * Enseña las piezas reales de `src/components/ui`, con datos inventados y en
 * todos sus estados, para verlas sin tener que llegar a la pantalla que las usa.
 * No es el prototipo: allí se decide el diseño, aquí se ve lo que ya se decidió.
 *
 * En producción no existe. La guarda va en el marco y no en cada página por la
 * misma razón que en el panel: una página nueva queda cerrada por nacer aquí
 * dentro. No enseña nada secreto, pero una dirección que responde en producción
 * sin ser parte del producto es superficie que nadie vigila.
 *
 * Los textos del propio catálogo están escritos en español y no pasan por
 * `src/lib/i18n`: es una herramienta de desarrollo, como la documentación. Los
 * componentes sí hablan el idioma elegido, porque eso es parte de lo que se
 * revisa.
 */
export default function CatalogLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  if (isProduction) notFound();

  return (
    <CatalogShell
      groups={entriesByGroup().map(({ group, entries }) => ({
        group,
        entries: entries.map(({ slug, title }) => ({ slug, title })),
      }))}
    >
      {children}
    </CatalogShell>
  );
}

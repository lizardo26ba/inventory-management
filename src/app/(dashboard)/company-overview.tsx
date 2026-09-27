'use client';

/**
 * La portada de la empresa activa.
 *
 * Es de cliente solo porque lee el idioma elegido. Todavía no tiene datos que
 * enseñar: los indicadores del prototipo salen de existencias, compras y ventas,
 * y ninguna de esas pantallas existe aún. Dice dónde se está y qué viene, en
 * lugar de inventar cifras o dejar la página en blanco.
 */

import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { useCopy } from '@/lib/i18n';

export function CompanyOverview({
  companyName,
}: {
  readonly companyName: string;
}): React.ReactElement {
  const copy = useCopy();

  return (
    <div className="space-y-6">
      <PageHeader title={copy.overview.title} subtitle={companyName} />
      <EmptyState message={copy.overview.notReady} />
    </div>
  );
}

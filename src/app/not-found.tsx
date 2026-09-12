import Link from 'next/link';

import { EMPTY_STATE_LINK_CLASS, EmptyState } from '@/components/ui/empty-state';
import { getCopy } from '@/lib/i18n/server';

/**
 * Dirección que no corresponde a ninguna pantalla.
 *
 * Es el último límite, el que atrapa lo que no cubre ningún grupo de rutas. Va
 * fuera del marco del panel a propósito: aquí todavía no se sabe si quien mira
 * tiene sesión, y dibujar la navegación sería prometer un acceso sin
 * comprobarlo.
 */
export default async function NotFound(): Promise<React.ReactElement> {
  const copy = await getCopy();

  return (
    <EmptyState message={copy.notFoundPage.message}>
      <Link href="/" className={EMPTY_STATE_LINK_CLASS}>
        {copy.notFoundPage.back}
      </Link>
    </EmptyState>
  );
}

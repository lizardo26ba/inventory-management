'use client';

/**
 * Lo que ve quien abre una pantalla de almacenes sin el permiso para ella, por
 * ejemplo escribiendo la dirección a mano: el menú ya no se la ofrece.
 *
 * Usa el mismo título y la misma frase que la pantalla de error de la
 * aplicación real ante un rechazo de autorización, para que el mismo rechazo se
 * explique igual en los dos sitios.
 */

import Link from 'next/link';

import { useCopy } from '@/lib/i18n';
import { EMPTY_STATE_LINK_CLASS, EmptyState } from '../../ui/empty-state';
import { OVERVIEW_PATH } from './paths';

export function WarehouseNoAccess(): React.ReactElement {
  const copy = useCopy();

  return (
    <EmptyState title={copy.errorPage.notAuthorizedTitle} message={copy.errors.notAuthorized}>
      <Link href={OVERVIEW_PATH as never} className={EMPTY_STATE_LINK_CLASS}>
        {copy.warehouses.backToOverview}
      </Link>
    </EmptyState>
  );
}

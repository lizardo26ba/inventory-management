import Link from 'next/link';

import { EMPTY_STATE_LINK_CLASS, EmptyState } from '@/components/ui/empty-state';
import { getCopy } from '@/lib/i18n/server';
import { ORGANIZATIONS_PATH } from '@/modules/organizations/routes';

/**
 * Lo que se ve cuando la empresa de la dirección no existe.
 *
 * Cubre la ficha y la edición, porque `notFound()` sube hasta el límite más
 * cercano y este es el suyo. Dentro del marco del panel, así que la navegación
 * sigue a la vista: quien llega aquí por un enlace viejo no se queda encerrado.
 *
 * El mensaje no distingue entre una empresa que nunca existió y una que se
 * borró. Distinguirlas delataría cuáles hubo.
 */
export default async function OrganizationNotFound(): Promise<React.ReactElement> {
  const copy = await getCopy();

  return (
    <EmptyState message={copy.organizationForm.notFound}>
      <Link href={ORGANIZATIONS_PATH} className={EMPTY_STATE_LINK_CLASS}>
        {copy.organizationForm.back}
      </Link>
    </EmptyState>
  );
}

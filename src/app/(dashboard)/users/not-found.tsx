import Link from 'next/link';

import { EMPTY_STATE_LINK_CLASS, EmptyState } from '@/components/ui/empty-state';
import { getCopy } from '@/lib/i18n/server';
import { USERS_PATH } from '@/modules/users/routes';

/**
 * Lo que se ve cuando la cuenta de la dirección no existe.
 *
 * Cubre la edición, porque `notFound()` sube hasta el límite más cercano y este
 * es el suyo. El mensaje no distingue entre una cuenta que nunca existió y una
 * que se borró: distinguirlas delataría quién tuvo cuenta.
 */
export default async function UserNotFound(): Promise<React.ReactElement> {
  const copy = await getCopy();

  return (
    <EmptyState message={copy.userForm.notFound}>
      <Link href={USERS_PATH} className={EMPTY_STATE_LINK_CLASS}>
        {copy.userForm.back}
      </Link>
    </EmptyState>
  );
}

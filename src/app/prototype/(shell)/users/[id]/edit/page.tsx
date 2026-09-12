'use client';

/**
 * Edición de usuario. Lee el almacén en memoria del prototipo; en la aplicación
 * real la persona la trae el servidor por su identificador.
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { EMPTY_STATE_LINK_CLASS, EmptyState } from '../../../../ui/empty-state';
import { useCopy } from '@/lib/i18n';
import { useUserStore } from '../../../../user-store';
import { UserForm } from '../../user-form';

export default function EditUserPage(): React.ReactElement {
  const copy = useCopy();

  const params = useParams<{ id: string }>();
  const { findById } = useUserStore();
  const user = findById(params.id);

  if (user === undefined) {
    return (
      <EmptyState message={copy.userForm.notFound}>
        <Link href={'/prototype/users' as never} className={EMPTY_STATE_LINK_CLASS}>
          {copy.userForm.back}
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link
          href={'/prototype/users' as never}
          className="text-text-muted hover:text-text text-sm hover:underline"
        >
          {copy.userForm.back}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {copy.userForm.editTitle}
        </h1>
        <p className="text-text-muted mt-1 text-sm">{copy.userForm.editSubtitle}</p>
      </div>

      <UserForm
        userId={user.id}
        initialValues={{
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          countryCode: user.countryCode,
          memberships: user.memberships,
          photoDataUrl: user.photoDataUrl,
          isPlatformAdmin: user.isPlatformAdmin ?? false,
          platformAdminReason: user.platformAdminReason ?? '',
        }}
      />
    </div>
  );
}

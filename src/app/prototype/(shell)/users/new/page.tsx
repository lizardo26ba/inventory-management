'use client';

import Link from 'next/link';

import { useCopy } from '@/lib/i18n';
import { UserForm } from '../user-form';

/** Alta de usuario. La pantalla solo compone: el formulario lo comparte con la
 *  edición. */
export default function NewUserPage(): React.ReactElement {
  const copy = useCopy();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link
          href={'/prototype/users' as never}
          className="text-text-muted hover:text-text text-sm hover:underline"
        >
          {copy.userForm.back}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{copy.userForm.title}</h1>
        <p className="text-text-muted mt-1 text-sm">{copy.userForm.subtitle}</p>
      </div>

      <UserForm />
    </div>
  );
}

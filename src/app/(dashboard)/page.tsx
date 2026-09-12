import { redirect } from 'next/navigation';

import { resolveLanding } from '@/modules/auth/landing';
import { CHANGE_PASSWORD_PATH, SIGN_IN_PATH } from '@/modules/auth/routes';
import { getSession } from '@/modules/auth/session';
import { ORGANIZATIONS_PATH } from '@/modules/organizations/routes';

import { NoAccessPanel } from './no-access-panel';

/**
 * La raíz no es una pantalla: es un desvío.
 *
 * A dónde va cada persona lo decide `resolveLanding`, que es una función pura y
 * está probada aparte. Aquí solo se traduce esa decisión a una ruta, de modo que
 * si mañana cambia el criterio, cambia en un sitio y no en cada pantalla.
 */
export default async function RootPage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) redirect(SIGN_IN_PATH);

  const landing = resolveLanding(session);

  switch (landing.kind) {
    case 'changePassword':
      redirect(CHANGE_PASSWORD_PATH);
    case 'organizations':
      redirect(ORGANIZATIONS_PATH);
    case 'company':
      // El resumen de la empresa activa todavía no existe. Mientras tanto, quien
      // tenga empresa elegida ve lo mismo que quien no alcanza ninguna, y eso es
      // preferible a una pantalla en blanco sin explicación.
      return <NoAccessPanel email={session.email} />;
    case 'noAccess':
      return <NoAccessPanel email={session.email} />;
  }
}

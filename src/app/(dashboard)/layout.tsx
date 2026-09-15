import { redirect } from 'next/navigation';

import { AppShell, type ShellContext } from '@/components/layout/app-shell';
import { ADMINISTRATION_SECTIONS } from '@/components/layout/navigation';
import { signOut } from '@/modules/auth/actions';
import { CHANGE_PASSWORD_PATH, SIGN_IN_PATH } from '@/modules/auth/routes';
import { getSession, holdsPlatformPermission } from '@/modules/auth/session';

/**
 * Marco de todo lo que exige haber entrado.
 *
 * La guarda está aquí y no en cada página a propósito. Negar por defecto
 * significa que una pantalla nueva queda protegida por nacer dentro de este
 * grupo, no por acordarse de comprobar algo. Es el principio 1 de CLAUDE.md.
 *
 * Quien arrastra una contraseña puesta por otra persona no pasa de aquí. La
 * pantalla de cambio vive fuera de este grupo justo para que esa redirección no
 * se persiga a sí misma.
 *
 * Aquí se decide además qué secciones enseña el menú. Se decide en el servidor y
 * con la misma comprobación que luego rechaza, no con una copia: un menú que
 * ofrezca lo que la pantalla va a negar es una promesa rota, y uno que esconda
 * lo permitido es una función que nadie encuentra. Que no sea autorización se
 * repite en el marco: lo que autoriza es la comprobación de cada pantalla, que
 * sigue estando aunque esta lista mienta.
 */
export default async function DashboardLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): Promise<React.ReactElement> {
  const session = await getSession();
  if (session === null) redirect(SIGN_IN_PATH);
  if (session.mustChangePassword) redirect(CHANGE_PASSWORD_PATH);

  // Sin empresa elegida se está por encima de todas ellas. Todavía no existe el
  // paso de entrar a una, así que este es hoy el único contexto posible; cuando
  // exista, aquí se leerán el nombre y la moneda de la empresa activa.
  const context: ShellContext = { kind: 'platform' };

  const sections = ADMINISTRATION_SECTIONS.filter((section) =>
    holdsPlatformPermission(session, section.permission),
  ).map((section) => section.key);

  return (
    <AppShell
      user={{
        firstName: session.firstName,
        lastName: session.lastName,
        email: session.email,
      }}
      context={context}
      sections={sections}
      signOut={signOut}
    >
      {children}
    </AppShell>
  );
}

import { redirect } from 'next/navigation';

import { AppShell, type ShellContext } from '@/components/layout/app-shell';
import {
  ADMINISTRATION_SECTIONS,
  OPERATION_SECTIONS,
  type NavSectionKey,
} from '@/components/layout/navigation';
import { leaveCompany, signOut } from '@/modules/auth/actions';
import { findCompanySummary, listCompanyChoices } from '@/modules/auth/repository';
import { CHANGE_PASSWORD_PATH, SELECT_COMPANY_PATH, SIGN_IN_PATH } from '@/modules/auth/routes';
import {
  getSession,
  holdsCompanyPermission,
  holdsPlatformPermission,
  requireCompanySession,
  type SessionContext,
} from '@/modules/auth/session';

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

  const { context, sections } =
    session.organizationId === null ? platformShell(session) : await companyShell();

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
      leaveCompany={leaveCompany}
    >
      {children}
    </AppShell>
  );
}

type Shell = {
  readonly context: ShellContext;
  readonly sections: readonly NavSectionKey[];
};

/** Sin empresa elegida se está por encima de todas ellas: la administración. */
function platformShell(session: SessionContext): Shell {
  return {
    context: { kind: 'platform' },
    sections: ADMINISTRATION_SECTIONS.filter((section) =>
      holdsPlatformPermission(session, section.permission),
    ).map((section) => section.key),
  };
}

/**
 * Dentro de una empresa: su operación.
 *
 * Pasa por la puerta de la empresa, que vuelve a comprobar el acceso y el
 * segundo factor. Si la cierra, el marco no se dibuja y el fallo llega a la
 * pantalla de error, que explica por qué.
 */
async function companyShell(): Promise<Shell> {
  const session = await requireCompanySession();
  const summary = await findCompanySummary(session.organizationId);

  // Solo un miembro de varias empresas tiene otra a la que cambiar desde aquí.
  // La plataforma cambia saliendo, y no se le preguntan sus membresías.
  const canSwitch =
    !session.actingAsPlatformAdmin && (await listCompanyChoices(session.userId)).length > 1;

  return {
    context: {
      kind: 'company',
      name: summary?.name ?? '',
      countryCode: summary?.countryCode ?? '',
      currencyCode: summary?.baseCurrencyCode ?? '',
      elevated: session.actingAsPlatformAdmin,
      switchHref: canSwitch ? SELECT_COMPANY_PATH : null,
    },
    sections: OPERATION_SECTIONS.filter(
      (section) =>
        section.permission === null || holdsCompanyPermission(session, section.permission),
    ).map((section) => section.key),
  };
}

'use client';

/**
 * Sesión de la maqueta: quién entró, en qué empresa trabaja y con qué alcance.
 *
 * Vive en la raíz del prototipo, por encima del marco, porque el acceso y el
 * selector de empresa quedan fuera del marco y necesitan leerla y escribirla
 * igual que las pantallas de dentro.
 *
 * Como el resto del prototipo, es memoria del navegador: se pierde al recargar y
 * vuelve a la cuenta de plataforma. En la aplicación real todo esto es la fila
 * de la sesión en la base, y cada cambio de empresa la rota. ADR 0007.
 */

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { DEFAULT_DEMO_ACCOUNT, type DemoAccount } from './demo-credentials';

type SessionStore = {
  readonly account: DemoAccount;
  /** La empresa en la que se trabaja, o ninguna. */
  readonly activeCompanyId: string | null;
  /**
   * Si está dentro de la empresa como plataforma y no como miembro. Es lo que
   * enciende el distintivo permanente del ADR 0005.
   */
  readonly isElevated: boolean;
  readonly signIn: (account: DemoAccount) => void;
  readonly signOut: () => void;
  readonly enterCompany: (companyId: string) => void;
  readonly leaveCompany: () => void;
};

const SessionStoreContext = createContext<SessionStore | null>(null);

export function SessionStoreProvider({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  const [account, setAccount] = useState<DemoAccount>(DEFAULT_DEMO_ACCOUNT);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);

  const signIn = useCallback((next: DemoAccount) => {
    setAccount(next);
    setActiveCompanyId(null);
  }, []);

  const signOut = useCallback(() => {
    setAccount(DEFAULT_DEMO_ACCOUNT);
    setActiveCompanyId(null);
  }, []);

  const enterCompany = useCallback((companyId: string) => {
    setActiveCompanyId(companyId);
  }, []);

  const leaveCompany = useCallback(() => {
    setActiveCompanyId(null);
  }, []);

  const value = useMemo<SessionStore>(
    () => ({
      account,
      activeCompanyId,
      // Un super administrador entra siempre como plataforma, aunque además sea
      // miembro de la empresa: es la decisión del ADR 0013. Así el distintivo y
      // la auditoría elevada no dependen de si alguna vez le dieron un rol.
      isElevated: account.isPlatformAdmin && activeCompanyId !== null,
      signIn,
      signOut,
      enterCompany,
      leaveCompany,
    }),
    [account, activeCompanyId, signIn, signOut, enterCompany, leaveCompany],
  );

  return <SessionStoreContext.Provider value={value}>{children}</SessionStoreContext.Provider>;
}

export function useSessionStore(): SessionStore {
  const store = useContext(SessionStoreContext);
  if (store === null) {
    throw new Error('useSessionStore necesita SessionStoreProvider por encima.');
  }
  return store;
}

/**
 * A dónde va una cuenta nada más entrar. Es el mismo orden que la decisión real
 * de `resolveLanding`: la plataforma a su lista, un miembro de una sola empresa
 * directo a ella, y uno de varias al selector.
 */
export function landingFor(account: DemoAccount): {
  readonly path: string;
  readonly companyId: string | null;
} {
  if (account.isPlatformAdmin) return { path: '/prototype/organizations', companyId: null };

  const [only, ...others] = account.memberships;
  if (only !== undefined && others.length === 0) {
    return { path: '/prototype', companyId: only.companyId };
  }

  return { path: '/prototype/select-company', companyId: null };
}

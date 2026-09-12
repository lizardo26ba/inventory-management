'use client';

/**
 * Almacén de usuarios del prototipo.
 *
 * Igual que el de empresas: vive en memoria del navegador y se pierde al
 * recargar. En la aplicación real la lista la sirve el servidor y cada cambio
 * es una Server Action que escribe en la base y revalida la ruta.
 *
 * Toda escritura devuelve una promesa y espera una latencia simulada. Sin esa
 * espera los estados de carga de la interfaz no se verían nunca y no se podrían
 * acordar. Al conectar las Server Actions, la firma ya es la correcta y solo
 * cambia lo que hay dentro.
 */

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { simulateWrite } from './latency';
import { users as seedUsers, type Membership, type User } from './users-data';

export type UserInput = {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly countryCode: string;
  readonly memberships: readonly Membership[];
  readonly photoDataUrl?: string;
};

type UserStore = {
  readonly users: readonly User[];
  readonly findById: (id: string) => User | undefined;
  readonly createUser: (input: UserInput) => Promise<void>;
  readonly updateUser: (id: string, input: UserInput) => Promise<void>;
  readonly setUserActive: (id: string, active: boolean) => Promise<void>;
  readonly deleteUser: (id: string) => Promise<void>;
};

const UserStoreContext = createContext<UserStore | null>(null);

function normalize(input: UserInput): UserInput {
  return {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim().toLowerCase(),
    countryCode: input.countryCode,
    memberships: input.memberships,
    photoDataUrl: input.photoDataUrl,
  };
}

export function UserStoreProvider({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  const [users, setUsers] = useState<readonly User[]>(seedUsers);

  const findById = useCallback((id: string) => users.find((user) => user.id === id), [users]);

  const createUser = useCallback(async (input: UserInput) => {
    await simulateWrite();
    setUsers((current) => [
      {
        id: `u-${String(Date.now())}`,
        ...normalize(input),
        active: true,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
  }, []);

  const updateUser = useCallback(async (id: string, input: UserInput) => {
    await simulateWrite();
    setUsers((current) =>
      current.map((user) => (user.id === id ? { ...user, ...normalize(input) } : user)),
    );
  }, []);

  const setUserActive = useCallback(async (id: string, active: boolean) => {
    await simulateWrite();
    setUsers((current) => current.map((user) => (user.id === id ? { ...user, active } : user)));
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    await simulateWrite();
    setUsers((current) => current.filter((user) => user.id !== id));
  }, []);

  const value = useMemo(
    () => ({ users, findById, createUser, updateUser, setUserActive, deleteUser }),
    [users, findById, createUser, updateUser, setUserActive, deleteUser],
  );

  return <UserStoreContext.Provider value={value}>{children}</UserStoreContext.Provider>;
}

export function useUserStore(): UserStore {
  const store = useContext(UserStoreContext);
  if (store === null) {
    throw new Error('useUserStore necesita estar dentro de UserStoreProvider.');
  }
  return store;
}

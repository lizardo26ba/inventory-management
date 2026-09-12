'use client';

/**
 * Almacén de empresas del prototipo.
 *
 * Crear, editar y eliminar necesitan que los cambios duren más que la pantalla
 * donde ocurren. Sin base de datos, eso vive en memoria del navegador y se
 * pierde al recargar. Es suficiente para acordar el diseño y deliberadamente
 * corto: nadie debe confundirlo con datos guardados.
 *
 * El proveedor se monta en el marco de la aplicación, no en cada página, para
 * que un alta hecha en el formulario siga estando al volver a la lista.
 *
 * En la aplicación real nada de esto existe. La lista la sirve el servidor y
 * cada cambio es una Server Action que escribe en la base y revalida la ruta.
 *
 * Toda escritura devuelve una promesa y espera una latencia simulada, para que
 * los estados de carga de la interfaz existan de verdad y se puedan acordar.
 */

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { buildCompanyCode } from './company-code';
import { simulateWrite } from './latency';
import {
  companies as seedCompanies,
  currentUser,
  findCountry,
  type Company,
} from './fake-data';

export type CompanyInput = {
  readonly name: string;
  readonly legalName: string;
  readonly countryCode: string;
  readonly currency: string;
  readonly taxId: string;
  readonly email: string;
  readonly phone: string;
  readonly address: string;
};

type CompanyStore = {
  readonly companies: readonly Company[];
  /** La empresa en la que se está trabajando. Es el contexto de la operación. */
  readonly activeCompany: Company | undefined;
  readonly enterCompany: (id: string) => void;
  readonly findById: (id: string) => Company | undefined;
  /** Si otra empresa del mismo país ya usa ese identificador fiscal. */
  readonly isTaxIdTaken: (
    countryCode: string,
    taxId: string,
    exceptCompanyId?: string,
  ) => boolean;
  readonly createCompany: (input: CompanyInput) => Promise<void>;
  readonly updateCompany: (id: string, input: CompanyInput) => Promise<void>;
  readonly setCompanyActive: (id: string, active: boolean) => Promise<void>;
  readonly deleteCompany: (id: string) => Promise<void>;
};

const CompanyStoreContext = createContext<CompanyStore | null>(null);

/**
 * Dos empresas del mismo país no pueden compartir identificador fiscal.
 *
 * Es una identidad ante una administración tributaria, no un dato descriptivo:
 * repetirla significa que una de las dos está mal registrada, y a partir de ahí
 * las facturas de una empresa se pueden atribuir a la otra. Entre países no
 * choca, porque cada administración numera por su cuenta y el mismo número en
 * dos países son dos contribuyentes distintos.
 *
 * En la aplicación real esta regla es una restricción única sobre el par país e
 * identificador. La comprobación del formulario existe para dar un mensaje
 * claro, no para sustituirla: entre la comprobación y la escritura cabe otra
 * alta, así que la base es la que manda.
 */
export class DuplicateTaxIdError extends Error {
  constructor() {
    super('Ya existe una empresa de ese país con ese identificador fiscal.');
    this.name = 'DuplicateTaxIdError';
  }
}

/**
 * Un mismo número se escribe de muchas formas: con guiones, con puntos, con
 * espacios o en minúsculas. Comparar el texto tal cual dejaría pasar el mismo
 * contribuyente escrito de dos maneras, que es justo lo que se quiere evitar.
 */
function normalizeTaxId(taxId: string): string {
  return taxId.replace(/[^0-9a-z]/gi, '').toUpperCase();
}

/**
 * El código no viaja en la entrada porque no lo escribe nadie: lo asigna el
 * sistema al crear y no cambia nunca más. Ver company-code.ts.
 */
function toCompanyFields(
  input: CompanyInput,
): Omit<
  Company,
  'id' | 'code' | 'userCount' | 'warehouseCount' | 'active' | 'createdAt' | 'createdByEmail'
> {
  return {
    name: input.name.trim(),
    legalName: input.legalName.trim(),
    countryCode: input.countryCode,
    countryName: findCountry(input.countryCode)?.name ?? input.countryCode,
    currency: input.currency,
    taxId: input.taxId.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    address: input.address.trim(),
  };
}

export function CompanyStoreProvider({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  const [companies, setCompanies] = useState<readonly Company[]>(seedCompanies);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);

  const activeCompany =
    companies.find((company) => company.id === activeCompanyId) ?? companies[0];

  const enterCompany = useCallback((id: string) => {
    setActiveCompanyId(id);
  }, []);

  const findById = useCallback(
    (id: string) => companies.find((company) => company.id === id),
    [companies],
  );

  const isTaxIdTaken = useCallback(
    (countryCode: string, taxId: string, exceptCompanyId?: string) => {
      const wanted = normalizeTaxId(taxId);
      // Sin identificador no hay nada que chocar: el vacío no identifica a
      // nadie y varias empresas pueden estar todavía sin registrar.
      if (wanted === '') return false;

      return companies.some(
        (company) =>
          company.id !== exceptCompanyId &&
          company.countryCode === countryCode &&
          normalizeTaxId(company.taxId ?? '') === wanted,
      );
    },
    [companies],
  );

  const createCompany = useCallback(
    async (input: CompanyInput) => {
      if (isTaxIdTaken(input.countryCode, input.taxId)) throw new DuplicateTaxIdError();
      await simulateWrite();
      setCompanies((current) => [
        {
          id: `c-${String(Date.now())}`,
          // Se calcula contra la lista del momento de escribir, no contra la
          // que vio el formulario: entre medias puede haberse creado otra.
          code: buildCompanyCode(
            input.name,
            current.map((company) => company.code),
          ),
          ...toCompanyFields(input),
          userCount: 0,
          warehouseCount: 0,
          active: true,
          createdAt: new Date().toISOString(),
          createdByEmail: currentUser.email,
        },
        ...current,
      ]);
    },
    [isTaxIdTaken],
  );

  const updateCompany = useCallback(
    async (id: string, input: CompanyInput) => {
      if (isTaxIdTaken(input.countryCode, input.taxId, id)) throw new DuplicateTaxIdError();
      await simulateWrite();
      setCompanies((current) =>
        current.map((company) =>
          company.id === id ? { ...company, ...toCompanyFields(input) } : company,
        ),
      );
    },
    [isTaxIdTaken],
  );

  const setCompanyActive = useCallback(async (id: string, active: boolean) => {
    await simulateWrite();
    setCompanies((current) =>
      current.map((company) => (company.id === id ? { ...company, active } : company)),
    );
  }, []);

  const deleteCompany = useCallback(async (id: string) => {
    await simulateWrite();
    setCompanies((current) => current.filter((company) => company.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      companies,
      activeCompany,
      enterCompany,
      findById,
      isTaxIdTaken,
      createCompany,
      updateCompany,
      setCompanyActive,
      deleteCompany,
    }),
    [
      companies,
      activeCompany,
      enterCompany,
      findById,
      isTaxIdTaken,
      createCompany,
      updateCompany,
      setCompanyActive,
      deleteCompany,
    ],
  );

  return <CompanyStoreContext.Provider value={value}>{children}</CompanyStoreContext.Provider>;
}

export function useCompanyStore(): CompanyStore {
  const store = useContext(CompanyStoreContext);
  if (store === null) {
    throw new Error('useCompanyStore necesita estar dentro de CompanyStoreProvider.');
  }
  return store;
}

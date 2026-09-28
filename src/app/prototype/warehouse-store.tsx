'use client';

/**
 * Almacenes de la maqueta, en memoria del navegador.
 *
 * Igual que el de empresas: los cambios duran más que la pantalla donde
 * ocurren y se pierden al recargar. En la aplicación real la lista la sirve el
 * servidor, filtrada por la empresa activa con la seguridad a nivel de fila, y
 * cada cambio es una Server Action que escribe en la base y deja su entrada en
 * la bitácora.
 *
 * Toda la lista es de todas las empresas, pero nada fuera de este archivo la
 * ve entera: se entrega ya recortada a la empresa activa, que es lo que hará la
 * base. ADR 0003, ADR 0010.
 */

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { useCompanyStore } from './company-store';
import { simulateWrite } from './latency';
import { warehouses as seedWarehouses, type Warehouse } from './fake-data';

export type WarehouseInput = {
  readonly name: string;
  readonly address: string;
  readonly countryCode: string;
  readonly timeZone: string;
};

/** Solo el alta lleva código: después no cambia. */
export type NewWarehouseInput = WarehouseInput & { readonly code: string };

type WarehouseStore = {
  /** Los almacenes de la empresa activa, y ninguno más. */
  readonly warehouses: readonly Warehouse[];
  readonly findById: (id: string) => Warehouse | undefined;
  /** Si otro almacén de la empresa activa ya usa ese código. */
  readonly isCodeTaken: (code: string) => boolean;
  readonly createWarehouse: (input: NewWarehouseInput) => Promise<void>;
  readonly updateWarehouse: (id: string, input: WarehouseInput) => Promise<void>;
  readonly setWarehouseActive: (id: string, active: boolean) => Promise<void>;
};

const WarehouseStoreContext = createContext<WarehouseStore | null>(null);

/**
 * Dos almacenes de la misma empresa no comparten código. RN-090. En la base es la
 * restricción única sobre empresa y código; la comprobación del formulario solo
 * existe para dar el mensaje junto al campo.
 */
export class DuplicateWarehouseCodeError extends Error {
  constructor() {
    super('Ya existe un almacén de esta empresa con ese código.');
    this.name = 'DuplicateWarehouseCodeError';
  }
}

/**
 * Un almacén con existencias no se archiva. Archivarlo dejaría mercancía
 * contada en un sitio donde ya no se puede mover, y el saldo de la empresa no
 * cuadraría con lo que se puede operar. RN-092.
 */
export class WarehouseHasStockError extends Error {
  constructor() {
    super('El almacén todavía tiene existencias.');
    this.name = 'WarehouseHasStockError';
  }
}

/**
 * Se guarda en mayúsculas y sin espacios alrededor. Así "main" y "MAIN " son el
 * mismo código y chocan, que es lo que se espera de un identificador corto.
 */
export function normalizeWarehouseCode(code: string): string {
  return code.trim().toUpperCase();
}

function toWarehouseFields(input: WarehouseInput): WarehouseInput {
  return {
    name: input.name.trim(),
    address: input.address.trim(),
    countryCode: input.countryCode,
    timeZone: input.timeZone,
  };
}

export function WarehouseStoreProvider({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  const [allWarehouses, setAllWarehouses] = useState<readonly Warehouse[]>(seedWarehouses);
  const { activeCompany } = useCompanyStore();
  const companyId = activeCompany?.id;

  const warehouses = useMemo(
    () => allWarehouses.filter((warehouse) => warehouse.companyId === companyId),
    [allWarehouses, companyId],
  );

  const findById = useCallback(
    (id: string) => warehouses.find((warehouse) => warehouse.id === id),
    [warehouses],
  );

  const isCodeTaken = useCallback(
    (code: string) => {
      const wanted = normalizeWarehouseCode(code);
      return wanted !== '' && warehouses.some((warehouse) => warehouse.code === wanted);
    },
    [warehouses],
  );

  const createWarehouse = useCallback(
    async (input: NewWarehouseInput) => {
      if (companyId === undefined) return;
      if (isCodeTaken(input.code)) throw new DuplicateWarehouseCodeError();
      await simulateWrite();
      const fields = toWarehouseFields(input);
      setAllWarehouses((current) => [
        ...current,
        {
          id: `w-${String(Date.now())}`,
          companyId,
          code: normalizeWarehouseCode(input.code),
          ...fields,
          address: fields.address === '' ? undefined : fields.address,
          active: true,
          hasStock: false,
        },
      ]);
    },
    [companyId, isCodeTaken],
  );

  const updateWarehouse = useCallback(async (id: string, input: WarehouseInput) => {
    await simulateWrite();
    const fields = toWarehouseFields(input);
    setAllWarehouses((current) =>
      current.map((warehouse) =>
        warehouse.id === id
          ? {
              ...warehouse,
              ...fields,
              address: fields.address === '' ? undefined : fields.address,
            }
          : warehouse,
      ),
    );
  }, []);

  const setWarehouseActive = useCallback(
    async (id: string, active: boolean) => {
      await simulateWrite();
      if (!active && findById(id)?.hasStock === true) throw new WarehouseHasStockError();
      setAllWarehouses((current) =>
        current.map((warehouse) =>
          warehouse.id === id ? { ...warehouse, active } : warehouse,
        ),
      );
    },
    [findById],
  );

  const value = useMemo(
    () => ({
      warehouses,
      findById,
      isCodeTaken,
      createWarehouse,
      updateWarehouse,
      setWarehouseActive,
    }),
    [warehouses, findById, isCodeTaken, createWarehouse, updateWarehouse, setWarehouseActive],
  );

  return (
    <WarehouseStoreContext.Provider value={value}>{children}</WarehouseStoreContext.Provider>
  );
}

export function useWarehouseStore(): WarehouseStore {
  const store = useContext(WarehouseStoreContext);
  if (store === null) {
    throw new Error('useWarehouseStore necesita estar dentro de WarehouseStoreProvider.');
  }
  return store;
}

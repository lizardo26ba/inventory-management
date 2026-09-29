/**
 * La frontera de los almacenes.
 *
 * RN-090 fija el formato del código y RN-091 que no cambie. La base defiende el
 * formato con su propia restricción; aquí se fija que la frontera lo rechace
 * antes, con una clave de error que la pantalla sabe traducir.
 */

import { describe, expect, it } from 'vitest';

import {
  createWarehouseSchema,
  parseWarehouseListQuery,
  updateWarehouseSchema,
} from '@/modules/warehouses/schema';

const VALID = {
  code: 'MAIN',
  name: 'Bodega central',
  countryCode: 'GT',
  timeZone: 'America/Guatemala',
};

function codeError(code: string): string | undefined {
  const parsed = createWarehouseSchema.safeParse({ ...VALID, code });
  return parsed.success ? undefined : parsed.error.issues[0]?.message;
}

describe('el código de un almacén (RN-090)', () => {
  it('se guarda en mayúsculas y sin espacios alrededor', () => {
    const parsed = createWarehouseSchema.parse({ ...VALID, code: '  norte-2 ' });

    expect(parsed.code).toBe('NORTE-2');
  });

  it.each(['A', 'MUY-LARGO-11', 'CON ESPACIO', 'ÑANDÚ', 'MAIN_1'])(
    'rechaza "%s" por su formato',
    (code) => {
      expect(codeError(code)).toBe('invalidWarehouseCode');
    },
  );

  it('rechaza el código vacío como obligatorio, no como mal formado', () => {
    expect(codeError('   ')).toBe('required');
  });
});

describe('la edición (RN-091)', () => {
  it('no admite el código: el esquema estricto lo rechaza en lugar de ignorarlo', () => {
    const { code: _code, ...editable } = VALID;
    const base = { ...editable, id: '0199a0b0-0000-7000-8000-000000000001', version: 0 };

    expect(updateWarehouseSchema.safeParse(base).success).toBe(true);
    expect(updateWarehouseSchema.safeParse({ ...base, code: 'OTRO' }).success).toBe(false);
  });
});

describe('los parámetros de la lista', () => {
  it('una dirección escrita a mano vuelve a los valores de partida en lugar de fallar', () => {
    expect(
      parseWarehouseListQuery({ sort: 'inventado', dir: 'arriba', q: ['main', 'x'] }),
    ).toEqual({ search: 'main', sort: 'name', direction: 'asc' });
  });
});

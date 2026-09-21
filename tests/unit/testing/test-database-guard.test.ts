/**
 * La guarda de la base de pruebas.
 *
 * La suite de integración borra la base a la que apunta. Estas pruebas fijan los tres
 * casos en que tiene que negarse, porque fallar en uno de ellos es vaciar la base de
 * desarrollo sin aviso. ADR 0009.
 *
 * Las cadenas no llevan contraseña y usan el dominio reservado para pruebas.
 */

import { describe, expect, it } from 'vitest';

import { checkTestDatabase } from '../../integration/support/test-database';

const TEST_BRANCH = 'postgresql://pruebas@ep-rama-pruebas.example.test/inventario_test';
const DEV_POOLER = 'postgresql://app@ep-rama-desarrollo-pooler.example.test/inventario_test';
const DEV_DIRECT = 'postgresql://migrador@ep-rama-desarrollo.example.test/inventario_test';

describe('checkTestDatabase', () => {
  it('acepta una base de pruebas en otra rama', () => {
    expect(checkTestDatabase(TEST_BRANCH, [DEV_POOLER, DEV_DIRECT])).toEqual({
      ok: true,
      url: TEST_BRANCH,
    });
  });

  it('se niega si la variable no está definida o está vacía', () => {
    expect(checkTestDatabase(undefined, [DEV_POOLER]).ok).toBe(false);
    expect(checkTestDatabase('  ', [DEV_POOLER]).ok).toBe(false);
  });

  it('se niega si no es una cadena de conexión', () => {
    expect(checkTestDatabase('esto no es una dirección', [DEV_POOLER]).ok).toBe(false);
  });

  it('se niega si la base no se declara de pruebas por su nombre', () => {
    const check = checkTestDatabase(
      'postgresql://pruebas@ep-rama-pruebas.example.test/neondb',
      [DEV_POOLER],
    );

    expect(check.ok).toBe(false);
  });

  it('se niega si es la misma base que la aplicación, aunque cambie el usuario', () => {
    const sameAsDirect = 'postgresql://otro@ep-rama-desarrollo.example.test/inventario_test';

    expect(checkTestDatabase(sameAsDirect, [undefined, DEV_DIRECT]).ok).toBe(false);
  });

  it('trata el agrupador y el host directo de Neon como el mismo destino', () => {
    expect(checkTestDatabase(DEV_DIRECT, [DEV_POOLER]).ok).toBe(false);
  });

  it('no enseña la cadena en el motivo, solo el nombre de la variable', () => {
    const check = checkTestDatabase(DEV_DIRECT, [DEV_POOLER]);

    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).not.toContain('ep-rama-desarrollo');
  });
});

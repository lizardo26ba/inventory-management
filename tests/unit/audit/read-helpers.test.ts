/**
 * Las dos piezas puras que usa la lectura de la bitácora.
 *
 * La primera protege a la pantalla de lo guardado: una columna JSON acepta
 * cualquier forma, y lo que se lee hoy pudo escribirlo una versión anterior.
 *
 * La segunda fija el corte de los filtros por día. El filtro son días del
 * calendario y lo guardado son instantes, así que alguien tiene que decidir dónde
 * empieza el día. Aquí es en tiempo universal, y está declarado.
 */

import { describe, expect, it } from 'vitest';

import { startOfNextUtcDay, startOfUtcDay, toAuditFields } from '@/modules/audit/service';

describe('toAuditFields', () => {
  it('acepta un objeto plano de valores simples', () => {
    expect(toAuditFields({ status: 'ACTIVE', attempts: 5, locked: true, taxId: null })).toEqual(
      {
        status: 'ACTIVE',
        attempts: 5,
        locked: true,
        taxId: null,
      },
    );
  });

  it('devuelve nada cuando no hay campos guardados', () => {
    expect(toAuditFields(null)).toBeNull();
  });

  it('rechaza formas que la aplicación nunca escribe', () => {
    expect(toAuditFields('texto suelto')).toBeNull();
    expect(toAuditFields([1, 2, 3])).toBeNull();
    expect(toAuditFields({ nested: { too: 'deep' } })).toBeNull();
  });
});

describe('corte de los días', () => {
  it('el día empieza a medianoche en tiempo universal', () => {
    expect(startOfUtcDay('2026-09-15').toISOString()).toBe('2026-09-15T00:00:00.000Z');
  });

  it('el corte de arriba es el principio del día siguiente, que no se incluye', () => {
    expect(startOfNextUtcDay('2026-09-15').toISOString()).toBe('2026-09-16T00:00:00.000Z');
  });

  it('cruza el fin de mes y el fin de año sin componer la fecha por partes', () => {
    expect(startOfNextUtcDay('2026-09-30').toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(startOfNextUtcDay('2026-12-31').toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
});

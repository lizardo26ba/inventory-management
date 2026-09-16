/**
 * Los parámetros de la bitácora llegan de la dirección, que es texto que escribe
 * cualquiera. Estas pruebas fijan lo que pasa cuando ese texto no tiene sentido:
 * la pantalla se muestra sin ese filtro, nunca con un error.
 *
 * Importa además porque de aquí sale lo que va a la consulta: un filtro que se
 * colara sin comprobar acabaría en un `WHERE` sin índice detrás.
 */

import { describe, expect, it } from 'vitest';

import { DEFAULT_AUDIT_PAGE_SIZE, parseAuditListQuery } from '@/modules/audit/schema';

describe('parseAuditListQuery', () => {
  it('sin parámetros, no filtra nada y usa el tamaño de partida', () => {
    expect(parseAuditListQuery({})).toEqual({ pageSize: DEFAULT_AUDIT_PAGE_SIZE });
  });

  it('lee lo que viene bien escrito', () => {
    expect(
      parseAuditListQuery({
        action: 'user.deleted',
        company: 'platform',
        actor: '  Ana@Example.test ',
        correlation: 'f2a0c8e2-0000-4000-8000-000000000001',
        from: '2026-09-01',
        to: '2026-09-15',
        size: '40',
      }),
    ).toEqual({
      action: 'user.deleted',
      organization: 'platform',
      actorEmail: 'ana@example.test',
      correlationId: 'f2a0c8e2-0000-4000-8000-000000000001',
      from: '2026-09-01',
      to: '2026-09-15',
      pageSize: 40,
    });
  });

  it('una acción que no existe en el catálogo se descarta', () => {
    expect(parseAuditListQuery({ action: 'stock.robado' }).action).toBeUndefined();
  });

  it('una fecha que no es un día del calendario se descarta', () => {
    expect(parseAuditListQuery({ from: 'ayer' }).from).toBeUndefined();
    expect(parseAuditListQuery({ to: '2026-09-15T10:00:00Z' }).to).toBeUndefined();
  });

  it('un parámetro vacío es un parámetro que no está', () => {
    const query = parseAuditListQuery({ action: '', company: '  ', actor: '' });

    expect(query.action).toBeUndefined();
    expect(query.organization).toBeUndefined();
    expect(query.actorEmail).toBeUndefined();
  });

  it('un tamaño de página fuera del menú no se acepta', () => {
    // Si no, cualquiera pediría diez mil filas cambiando la dirección.
    expect(parseAuditListQuery({ size: '10000' }).pageSize).toBe(DEFAULT_AUDIT_PAGE_SIZE);
    expect(parseAuditListQuery({ size: '-20' }).pageSize).toBe(DEFAULT_AUDIT_PAGE_SIZE);
  });

  it('recorta un identificador desmesurado en lugar de mandarlo a la base', () => {
    expect(
      parseAuditListQuery({ correlation: 'x'.repeat(5000) }).correlationId,
    ).toBeUndefined();
  });

  it('toma el primer valor cuando un parámetro llega repetido', () => {
    expect(parseAuditListQuery({ company: ['c-01', 'c-02'] }).organization).toBe('c-01');
  });
});

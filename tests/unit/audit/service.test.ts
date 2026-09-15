/**
 * Las reglas puras de la bitácora de auditoría.
 *
 * Tres cosas que no se pueden romper sin que nadie lo note en la base:
 *
 * 1. Que el antes y el después guarden solo lo que cambió.
 * 2. Que lo hecho con privilegio de plataforma quede marcado. RN-072.
 * 3. Que un campo sensible no llegue a escribirse. En una tabla de solo
 *    inserción no hay forma de limpiarlo después.
 */

import { describe, expect, it } from 'vitest';

import { InternalError } from '@/lib/errors';
import { diffFields, isElevated, toAuditRow } from '@/modules/audit/service';
import { type AuditContext, type AuditEntry } from '@/modules/audit/types';

/** Dirección del rango reservado para documentación. No es de nadie. */
const CONTEXT: AuditContext = {
  actorId: 'usuario-que-opera',
  organizationId: 'empresa-de-la-sesion',
  actingAsPlatformAdmin: false,
  permissionCode: null,
  ipAddress: '203.0.113.7',
  userAgent: 'navegador-de-prueba',
  correlationId: 'correlacion-de-prueba',
};

const ENTRY: AuditEntry = {
  action: 'organization.updated',
  entityType: 'Organization',
  entityId: 'empresa-afectada',
  entityLabel: 'Distribuidora Central',
};

describe('diffFields', () => {
  it('guarda solo los campos que cambiaron', () => {
    const changes = diffFields(
      { name: 'Central', phone: '5555-0000', email: 'a@example.test' },
      { name: 'Central', phone: '5555-1111', email: 'a@example.test' },
    );

    expect(changes).toEqual({ before: { phone: '5555-0000' }, after: { phone: '5555-1111' } });
  });

  it('no devuelve nada cuando nada cambió, para no dejar entradas vacías', () => {
    expect(diffFields({ name: 'Central' }, { name: 'Central' })).toBeNull();
  });

  it('un campo ausente cuenta como nulo, que es lo que era en la base', () => {
    expect(diffFields({}, { taxId: null })).toBeNull();
    expect(diffFields({}, { taxId: '1234567-8' })).toEqual({
      before: { taxId: null },
      after: { taxId: '1234567-8' },
    });
  });
});

describe('isElevated', () => {
  it('marca a un super administrador dentro de una empresa ajena', () => {
    expect(isElevated(true, null)).toBe(true);
  });

  it('marca toda operación autorizada por un permiso de plataforma', () => {
    expect(isElevated(false, 'platform.organization:create')).toBe(true);
  });

  it('no marca un permiso de empresa ni lo que no pide permiso', () => {
    expect(isElevated(false, 'audit:read')).toBe(false);
    expect(isElevated(false, null)).toBe(false);
  });
});

describe('toAuditRow', () => {
  it('copia quién, desde dónde y la correlación del contexto', () => {
    const row = toAuditRow(CONTEXT, ENTRY);

    expect(row).toMatchObject({
      actorId: 'usuario-que-opera',
      ipAddress: '203.0.113.7',
      userAgent: 'navegador-de-prueba',
      correlationId: 'correlacion-de-prueba',
      before: null,
      after: null,
    });
  });

  it('sin empresa declarada toma la de la sesión', () => {
    expect(toAuditRow(CONTEXT, ENTRY).organizationId).toBe('empresa-de-la-sesion');
  });

  it('la empresa afectada manda sobre la de la sesión, y null dice que no hay ninguna', () => {
    expect(toAuditRow(CONTEXT, { ...ENTRY, organizationId: 'otra' }).organizationId).toBe(
      'otra',
    );
    expect(toAuditRow(CONTEXT, { ...ENTRY, organizationId: null }).organizationId).toBeNull();
  });

  it('el permiso propio de la entrada manda y decide el privilegio elevado', () => {
    const row = toAuditRow(
      { ...CONTEXT, permissionCode: null },
      { ...ENTRY, permissionCode: 'platform.admin:grant' },
    );

    expect(row.permissionCode).toBe('platform.admin:grant');
    expect(row.actingAsPlatformAdmin).toBe(true);
  });

  it('sin permiso de plataforma ni marca en la sesión, la entrada no es elevada', () => {
    expect(toAuditRow(CONTEXT, ENTRY).actingAsPlatformAdmin).toBe(false);
  });

  it.each(['passwordHash', 'resetToken', 'twoFactorSecret', 'Authorization'])(
    'rechaza la operación si un campo se llama %s',
    (field) => {
      expect(() => toAuditRow(CONTEXT, { ...ENTRY, after: { [field]: 'valor' } })).toThrow(
        InternalError,
      );
      expect(() => toAuditRow(CONTEXT, { ...ENTRY, before: { [field]: 'valor' } })).toThrow(
        InternalError,
      );
    },
  );
});

/**
 * Quién puede trabajar dentro de una empresa, decidido sin tocar nada.
 *
 * Vive aparte y sin la marca de solo servidor por la misma razón que
 * `landing.ts`: es una decisión, no una consulta, y así se prueba sola. Lo que
 * sabe de la base le llega ya leído.
 */

import { ORGANIZATION_PERMISSIONS, type PermissionCode } from '@/lib/auth/permissions';

import type { SessionContext } from './session-context';

/**
 * Los permisos que hacen de alguien administrador de empresa, a efectos del
 * segundo factor de RN-005.
 *
 * No es el nombre del rol, porque las reglas de backend prohíben preguntar por
 * él: un rol que una empresa cree con otro nombre tendría el mismo poder. Son los
 * dos permisos con los que una persona decide quién entra y con qué, y con
 * cualquiera de ellos puede concederse todo lo demás.
 */
export const COMPANY_ADMINISTRATION_PERMISSIONS = [
  'user:update',
  'role:update',
] as const satisfies readonly PermissionCode[];

/**
 * Lo que un super administrador tiene dentro de una empresa: todo lo de empresa.
 * La verificación sigue ocurriendo en el mismo punto; solo cambia la respuesta.
 * ADR 0005.
 */
const EVERY_ORGANIZATION_PERMISSION: ReadonlySet<PermissionCode> = new Set(
  ORGANIZATION_PERMISSIONS.map((permission) => permission.code),
);

export function everyOrganizationPermission(): ReadonlySet<PermissionCode> {
  return EVERY_ORGANIZATION_PERMISSION;
}

export type CompanyAccessVerdict = 'GRANTED' | 'TWO_FACTOR_MISSING';

/**
 * Si un miembro puede trabajar en la empresa con los permisos que tiene en ella.
 *
 * Solo un administrador de empresa necesita el segundo factor, y solo mientras
 * la configuración lo exija: comparte la suspensión temporal del super
 * administrador hasta que existan sus pantallas. ADR 0013.
 *
 * El super administrador no pasa por aquí: su puerta es la de plataforma, que ya
 * pide el segundo factor por su cuenta.
 */
export function judgeMemberAccess(
  session: Pick<SessionContext, 'twoFactorVerifiedAt'>,
  permissions: ReadonlySet<PermissionCode>,
  twoFactorRequired: boolean,
): CompanyAccessVerdict {
  const administers = COMPANY_ADMINISTRATION_PERMISSIONS.some((code) => permissions.has(code));

  if (administers && twoFactorRequired && session.twoFactorVerifiedAt === null) {
    return 'TWO_FACTOR_MISSING';
  }

  return 'GRANTED';
}

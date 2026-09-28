/**
 * Lo que alcanza dentro de una empresa quien entra como plataforma.
 *
 * Vive aparte y sin la marca de solo servidor por la misma razón que
 * `landing.ts`: es una decisión, no una consulta, y así se prueba sola.
 *
 * Aquí vivía también la puerta que pedía el segundo factor a los administradores
 * de empresa. RN-005 ya no lo pide: el segundo factor es solo del super
 * administrador. ADR 0014.
 */

import { ORGANIZATION_PERMISSIONS, type PermissionCode } from '@/lib/auth/permissions';

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

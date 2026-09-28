'use client';

/**
 * Lo que la sesión de la maqueta puede hacer dentro de la empresa activa.
 *
 * Es la copia de juguete de `requireCompanyPermission`: un miembro tiene los
 * permisos de su rol en esa empresa, y un super administrador los tiene todos,
 * porque entra siempre como plataforma. ADR 0005, ADR 0013.
 *
 * En la maqueta solo decide qué se dibuja. En la aplicación real lo mismo lo
 * decide el servidor, y además rechaza la operación aunque la pantalla la
 * ofreciera. Principio 1 de CLAUDE.md.
 */

import { useCompanyStore } from './company-store';
import { useSessionStore } from './session-store';
import { allPermissionCodes, findRole } from './users-data';

const EVERY_PERMISSION: ReadonlySet<string> = new Set(allPermissionCodes);
const NO_PERMISSION: ReadonlySet<string> = new Set();

export function useCompanyPermissions(): ReadonlySet<string> {
  const { account } = useSessionStore();
  const { activeCompany } = useCompanyStore();

  if (account.isPlatformAdmin) return EVERY_PERMISSION;

  const membership = account.memberships.find(
    (candidate) => candidate.companyId === activeCompany?.id,
  );
  if (membership === undefined) return NO_PERMISSION;

  return new Set(findRole(membership.roleCode)?.permissions ?? []);
}

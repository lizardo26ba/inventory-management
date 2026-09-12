'use client';

/**
 * Los permisos que resultan de los roles concedidos.
 *
 * No se marcan de uno en uno a propósito. Repartir permisos sueltos por persona
 * parece flexible y acaba en una maraña que nadie sabe auditar: si hace falta una
 * combinación nueva, se crea un rol. Aquí solo se enseña el resultado, para que
 * quien concede vea lo que acaba de conceder antes de guardar.
 *
 * Se resuelve en el navegador a partir del catálogo de roles del sistema, que es
 * dato puro. Así la lista responde al instante a cada cambio de rol, sin una
 * vuelta al servidor por cada clic.
 *
 * Los roles que crea una empresa no están en ese catálogo, así que sus permisos
 * no se pueden anticipar aquí. Se dice, en lugar de mostrar una lista incompleta
 * como si estuviera completa.
 *
 * Los permisos se nombran por su código y no por una frase. Es el mismo texto que
 * aparecerá en la bitácora, es igual en los dos idiomas, y traducir cincuenta y
 * cinco descripciones es un trabajo aparte que todavía no está hecho.
 */

import { Checkbox } from '@/components/ui/checkbox';
import {
  ORGANIZATION_PERMISSIONS,
  ROLE_TEMPLATES,
  permissionsForRoleTemplate,
} from '@/lib/auth/permissions';
import { useCopy } from '@/lib/i18n';

import { type AccessInput } from '../schema';
import { type OrganizationChoice } from '../types';

/** Los permisos de empresa, agrupados por el recurso al que alcanzan. */
const GROUPS = ORGANIZATION_PERMISSIONS.reduce<Map<string, string[]>>((groups, permission) => {
  const codes = groups.get(permission.resource) ?? [];
  codes.push(permission.code);
  groups.set(permission.resource, codes);
  return groups;
}, new Map());

function grantedCodes(
  accesses: readonly AccessInput[],
  organizations: readonly OrganizationChoice[],
): { readonly codes: ReadonlySet<string>; readonly hasCustomRole: boolean } {
  const codes = new Set<string>();
  let hasCustomRole = false;

  const roleById = new Map(
    organizations.flatMap((organization) =>
      organization.roles.map((role) => [role.id, role.code] as const),
    ),
  );

  for (const access of accesses) {
    const code = roleById.get(access.roleId);
    const template = ROLE_TEMPLATES.find((candidate) => candidate.code === code);

    if (template === undefined) {
      hasCustomRole = true;
      continue;
    }

    for (const permission of permissionsForRoleTemplate(template)) codes.add(permission);
  }

  return { codes, hasCustomRole };
}

export function PermissionPreview({
  accesses,
  organizations,
}: {
  readonly accesses: readonly AccessInput[];
  readonly organizations: readonly OrganizationChoice[];
}): React.ReactElement {
  const copy = useCopy();

  if (accesses.length === 0) {
    return <p className="text-text-muted text-sm">{copy.userForm.permissionsEmpty}</p>;
  }

  const { codes, hasCustomRole } = grantedCodes(accesses, organizations);

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        {[...GROUPS].map(([resource, permissionCodes]) => (
          <div key={resource}>
            <p className="text-text-muted text-xs font-semibold tracking-wide uppercase">
              {resource}
            </p>
            <ul className="mt-2 space-y-1.5">
              {permissionCodes.map((code) => {
                const isGranted = codes.has(code);
                return (
                  <li
                    key={code}
                    className={`flex items-center gap-2 font-mono text-xs ${
                      isGranted ? '' : 'text-text-muted'
                    }`}
                  >
                    <Checkbox checked={isGranted} label={code} isReadOnly />
                    {code}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {hasCustomRole ? (
        <p className="text-text-muted text-xs">{copy.userForm.permissionsHelp}</p>
      ) : null}
    </>
  );
}

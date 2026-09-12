/**
 * Siembra en una empresa los roles que toda empresa tiene.
 *
 * Vive en `lib/db` y no dentro del dominio de empresas porque tiene dos
 * llamadores en orillas distintas: el alta de empresa, que los crea dentro de su
 * transacción, y la semilla, que rellena las empresas creadas antes de que estos
 * roles existieran. Escribirlo dos veces garantizaría que un día no coincidan.
 *
 * No importa el cliente de Prisma ni `server-only`: recibe el cliente que le
 * pasen. Así la semilla, que corre fuera de Next, puede usarlo igual.
 *
 * Es idempotente. Se puede llamar sobre una empresa que ya tiene sus roles y no
 * duplica nada: el único por empresa y código lo impide, y los permisos que ya
 * estaban se omiten en lugar de fallar.
 */

import { type Prisma } from '@prisma/client';

import { ROLE_TEMPLATES, permissionsForRoleTemplate } from '@/lib/auth/permissions';

export type SystemRolesResult = {
  /** Roles que no existían y se crearon. */
  readonly rolesCreated: number;
  /** Permisos que se ataron a un rol en esta pasada. */
  readonly permissionsGranted: number;
};

export async function createSystemRoles(
  tx: Prisma.TransactionClient,
  organizationId: string,
): Promise<SystemRolesResult> {
  // Los permisos se resuelven por código contra lo que hay sembrado. Un permiso
  // declarado en el código pero todavía no sembrado no revienta el alta: se queda
  // fuera del rol, y la siembra siguiente lo añade.
  const permissions = await tx.permission.findMany({
    where: { scope: 'ORGANIZATION' },
    select: { id: true, code: true },
  });
  const permissionIdByCode = new Map(permissions.map((row) => [row.code, row.id]));

  let rolesCreated = 0;
  let permissionsGranted = 0;

  for (const template of ROLE_TEMPLATES) {
    const existing = await tx.role.findUnique({
      where: { organizationId_code: { organizationId, code: template.code } },
      select: { id: true },
    });

    const role =
      existing ??
      (await tx.role.create({
        data: {
          organizationId,
          code: template.code,
          name: template.name,
          description: template.description,
          isSystem: true,
        },
        select: { id: true },
      }));

    if (existing === null) rolesCreated += 1;

    const rows = permissionsForRoleTemplate(template)
      .map((code) => permissionIdByCode.get(code))
      .filter((id): id is string => id !== undefined)
      .map((permissionId) => ({ roleId: role.id, permissionId }));

    const result = await tx.rolePermission.createMany({ data: rows, skipDuplicates: true });
    permissionsGranted += result.count;
  }

  return { rolesCreated, permissionsGranted };
}

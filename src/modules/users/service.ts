/**
 * Reglas del dominio de usuarios que no necesitan base de datos.
 *
 * Son funciones puras y por eso están aquí: se prueban sin levantar nada y no
 * importan Prisma ni Next.
 */

import { randomInt } from 'node:crypto';

import { MINIMUM_PASSWORD_LENGTH } from '@/modules/auth/schema';

import { type AccessInput } from './schema';

/**
 * El alfabeto de las contraseñas temporales.
 *
 * Sin letras ni dígitos que se confundan al dictar o al leer a mano: la O y el
 * cero, la ele y el uno, la i mayúscula. Una contraseña que se transcribe mal
 * termina en un intento fallido y en una llamada.
 */
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

/**
 * En grupos, con guiones, para poder leerla en voz alta sin perder la cuenta.
 * Cuatro grupos de cuatro suman dieciséis caracteres, por encima del mínimo.
 */
const GROUP_LENGTH = 4;
const GROUP_COUNT = 4;

/**
 * Una contraseña temporal para una cuenta nueva.
 *
 * Es temporal de verdad: la cuenta nace obligada a cambiarla, porque mientras
 * siga puesta hay una credencial que conoce quien creó la cuenta.
 *
 * El azar viene de `randomInt`, que es criptográfico. `Math.random` es predecible
 * y aquí lo predecible es una puerta abierta.
 */
export function generateTemporaryPassword(): string {
  const groups: string[] = [];

  for (let group = 0; group < GROUP_COUNT; group += 1) {
    let characters = '';
    for (let index = 0; index < GROUP_LENGTH; index += 1) {
      characters += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
    }
    groups.push(characters);
  }

  const password = groups.join('-');

  // Si alguien cambia los grupos y la deja por debajo del mínimo, esto lo dice
  // aquí y no cuando la política de contraseñas la rechace al cambiarla.
  if (password.replaceAll('-', '').length < MINIMUM_PASSWORD_LENGTH) {
    throw new Error('La contraseña temporal quedó por debajo del mínimo de la política.');
  }

  return password;
}

export type AccessChanges = {
  /** Empresas donde hay que crear la membresía. */
  readonly granted: readonly AccessInput[];
  /** Empresas donde se revoca el acceso. */
  readonly revokedOrganizationIds: readonly string[];
  /** Accesos que siguen, pero con otro rol. */
  readonly roleChanged: readonly AccessInput[];
};

/**
 * Qué hay que cambiar para pasar de los accesos actuales a los pedidos.
 *
 * Se calcula la diferencia en lugar de borrar todo y volver a escribirlo. Borrar
 * y reescribir perdería desde cuándo alguien tiene acceso a una empresa, y ese
 * dato es justo el que se mira cuando algo sale mal.
 */
export function diffAccesses(
  current: readonly AccessInput[],
  next: readonly AccessInput[],
): AccessChanges {
  const currentByOrganization = new Map(
    current.map((access) => [access.organizationId, access.roleId]),
  );
  const nextByOrganization = new Map(
    next.map((access) => [access.organizationId, access.roleId]),
  );

  const granted: AccessInput[] = [];
  const roleChanged: AccessInput[] = [];

  for (const [organizationId, roleId] of nextByOrganization) {
    const currentRoleId = currentByOrganization.get(organizationId);
    if (currentRoleId === undefined) granted.push({ organizationId, roleId });
    else if (currentRoleId !== roleId) roleChanged.push({ organizationId, roleId });
  }

  const revokedOrganizationIds = [...currentByOrganization.keys()].filter(
    (organizationId) => !nextByOrganization.has(organizationId),
  );

  return { granted, revokedOrganizationIds, roleChanged };
}

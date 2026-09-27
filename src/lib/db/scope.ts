import 'server-only';

/**
 * El contexto que la base necesita para aplicar sus políticas.
 *
 * PostgreSQL no sabe en qué empresa actúa quien consulta. Hay que decírselo, y se
 * le dice aquí: toda operación pasa por este ayudante, que abre una transacción y
 * fija tres valores de sesión antes de ejecutar nada.
 *
 * `set_config` con `true` ata el valor a la transacción. Con el agrupador de
 * conexiones en modo transacción, la conexión se recicla al terminar, así que la
 * petición siguiente no puede heredar la empresa de la anterior. Sin ese `true`,
 * el aislamiento se convertiría en una fuga entre clientes.
 *
 * Consecuencia que conviene saber: **toda consulta corre dentro de una
 * transacción**, también las lecturas. Es un viaje más a la base por operación, y
 * es el precio de la segunda barrera. Ver ADR 0010.
 *
 * Si alguien consulta sin pasar por aquí, no hay contexto y las políticas no
 * encuentran empresa: la respuesta son cero filas. Falla cerrado, que es como
 * tiene que fallar.
 */

import type { Prisma } from '@prisma/client';

import { prisma } from './client';

export type DataScope = {
  /** La empresa en la que se actúa, o ninguna en lo que es de plataforma. */
  readonly organizationId: string | null;
  /**
   * La persona, solo cuando todavía no hay empresa. Deja leer sus membresías
   * activas, sus empresas y sus roles, y nada más: sirve para ofrecerle dónde
   * entrar y para comprobar en cada petición que su acceso sigue vivo. Se crea
   * con `personalScope`, y ningún otro alcance la lleva, porque dentro de una
   * empresa añadiría a la vista lo que la persona tiene en las demás. ADR 0013.
   */
  readonly userId: string | null;
  /**
   * La excepción del super administrador, que el ADR 0005 exige explícita. Con
   * ella las políticas dejan ver por encima de las empresas; sin ella, no.
   */
  readonly actingAsPlatformAdmin: boolean;
};

/** Lo que alcanza quien todavía no tiene sesión: nada de ninguna empresa. */
export const ANONYMOUS_SCOPE: DataScope = {
  organizationId: null,
  userId: null,
  actingAsPlatformAdmin: false,
};

/**
 * Lo propio de una persona, sin empresa elegida. Solo lectura: las políticas que
 * la persona abre son de consulta, así que para escribir sigue haciendo falta
 * una empresa.
 */
export function personalScope(userId: string): DataScope {
  return { organizationId: null, userId, actingAsPlatformAdmin: false };
}

const PLATFORM_ON = 'on';
const PLATFORM_OFF = 'off';

/**
 * Abre la transacción de una operación con su contexto puesto.
 *
 * Las tres variables se fijan en una sola ida a la base: son tres llamadas en la
 * misma sentencia, no tres viajes.
 */
export async function withScope<T>(
  scope: DataScope,
  run: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT
        set_config('app.organization_id', ${scope.organizationId ?? ''}, true),
        set_config('app.user_id', ${scope.userId ?? ''}, true),
        set_config('app.platform_admin', ${
          scope.actingAsPlatformAdmin ? PLATFORM_ON : PLATFORM_OFF
        }, true)
    `;

    return run(tx);
  });
}

import 'server-only';

/**
 * El contexto que la base necesita para aplicar sus políticas.
 *
 * PostgreSQL no sabe en qué empresa actúa quien consulta. Hay que decírselo, y se
 * le dice aquí: toda operación pasa por este ayudante, que abre una transacción y
 * fija dos valores de sesión antes de ejecutar nada.
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

import { type Prisma } from '@prisma/client';

import { prisma } from './client';

export type DataScope = {
  /** La empresa en la que se actúa, o ninguna en lo que es de plataforma. */
  readonly organizationId: string | null;
  /**
   * La excepción del super administrador, que el ADR 0005 exige explícita. Con
   * ella las políticas dejan ver por encima de las empresas; sin ella, no.
   */
  readonly actingAsPlatformAdmin: boolean;
};

/** Lo que alcanza quien todavía no tiene sesión: nada de ninguna empresa. */
export const ANONYMOUS_SCOPE: DataScope = {
  organizationId: null,
  actingAsPlatformAdmin: false,
};

const PLATFORM_ON = 'on';
const PLATFORM_OFF = 'off';

/**
 * Abre la transacción de una operación con su contexto puesto.
 *
 * Las dos variables se fijan en una sola ida a la base: son dos llamadas en la
 * misma sentencia, no dos viajes.
 */
export async function withScope<T>(
  scope: DataScope,
  run: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT
        set_config('app.organization_id', ${scope.organizationId ?? ''}, true),
        set_config('app.platform_admin', ${
          scope.actingAsPlatformAdmin ? PLATFORM_ON : PLATFORM_OFF
        }, true)
    `;

    return run(tx);
  });
}

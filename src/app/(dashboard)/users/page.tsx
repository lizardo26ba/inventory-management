import { requirePlatformPermission, scopeOf } from '@/modules/auth';
import { UsersView } from '@/modules/users/components/users-view';
import { listUsers, summarizeUsers } from '@/modules/users/repository';
import { parseUserListQuery } from '@/modules/users/schema';

/**
 * Lista de usuarios de toda la plataforma.
 *
 * Pide el permiso antes de leer nada. Saber quién tiene cuenta y a qué empresas
 * alcanza no le corresponde a cualquiera, y esta consulta no debe llegar a la
 * base si quien pregunta no puede verla.
 *
 * Los parámetros se leen de la dirección y se validan, así que una dirección
 * escrita a mano no puede pedir diez mil filas ni ordenar por una columna
 * inventada.
 */
export default async function UsersPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  const session = await requirePlatformPermission('platform.user:read');
  const scope = scopeOf(session);

  const query = parseUserListQuery(await searchParams);
  const [page, summary] = await Promise.all([listUsers(scope, query), summarizeUsers(scope)]);

  return <UsersView items={page.items} total={page.total} summary={summary} query={query} />;
}

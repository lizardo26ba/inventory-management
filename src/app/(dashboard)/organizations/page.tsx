import { OrganizationsView } from '@/modules/organizations/components/organizations-view';
import { listOrganizations, summarizeOrganizations } from '@/modules/organizations/repository';
import { parseOrganizationListQuery } from '@/modules/organizations/schema';
import { requirePlatformPermission } from '@/modules/auth/session';

/**
 * Lista de empresas de la plataforma.
 *
 * Lo primero que hace es pedir el permiso, antes de leer nada. No es una
 * formalidad: ver qué empresas existen y cuánta gente tienen ya es información
 * que no le corresponde a cualquiera, y esta consulta no debe llegar a la base
 * si quien pregunta no puede verla.
 *
 * Los parámetros de la lista se leen de la dirección y se validan, de modo que
 * una dirección escrita a mano no pueda pedir diez mil filas ni ordenar por una
 * columna inventada.
 */
export default async function OrganizationsPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  await requirePlatformPermission('platform.organization:read');

  const query = parseOrganizationListQuery(await searchParams);
  const [page, summary] = await Promise.all([
    listOrganizations(query),
    summarizeOrganizations(),
  ]);

  return (
    <OrganizationsView items={page.items} total={page.total} summary={summary} query={query} />
  );
}

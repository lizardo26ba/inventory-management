import {
  AUDIT_ENTRY_PARAM,
  findPlatformAuditEntry,
  listPlatformAuditEntries,
  parseAuditListQuery,
} from '@/modules/audit';
import { AuditView } from '@/modules/audit/components/audit-view';
import { scopeOf } from '@/modules/auth/scope';
import { requirePlatformPermission } from '@/modules/auth/session';
import { listOrganizations } from '@/modules/organizations/repository';

/**
 * Bitácora de auditoría de toda la plataforma.
 *
 * Lo primero que hace es pedir el permiso, antes de leer nada. No es una
 * formalidad: la bitácora dice qué hizo cada persona en cada empresa, y es de lo
 * más sensible del sistema. RN-072, RN-073.
 *
 * Es una lectura por encima de las empresas, que solo alcanza el super
 * administrador. Lo declara el nombre de la consulta, que es la excepción del
 * ADR 0005.
 *
 * Los parámetros se leen de la dirección y se validan, de modo que una dirección
 * escrita a mano no pueda pedir mil filas ni filtrar por algo sin índice.
 */
export default async function AuditPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  const session = await requirePlatformPermission('platform.audit:read');
  // El alcance viaja a la base, que aplica sus políticas con él. Se construye
  // después de autorizar, nunca antes. ADR 0010.
  const scope = scopeOf(session);

  const params = await searchParams;
  const query = parseAuditListQuery(params);

  const openEntry = params[AUDIT_ENTRY_PARAM];
  const openEntryId = Array.isArray(openEntry) ? openEntry[0] : openEntry;

  // Las empresas son las opciones del filtro. La lista de plataforma cabe de
  // sobra en una página; cuando deje de caber, esta consulta será propia.
  const [page, companies, detail] = await Promise.all([
    listPlatformAuditEntries(scope, query),
    listOrganizations(scope, {
      search: '',
      sort: 'name',
      direction: 'asc',
      page: 1,
      pageSize: 100,
    }),
    openEntryId === undefined || openEntryId === ''
      ? null
      : findPlatformAuditEntry(scope, openEntryId),
  ]);

  return (
    <AuditView
      page={page}
      params={params}
      companies={companies.items.map((company) => ({ id: company.id, name: company.name }))}
      detail={detail}
      pageSize={query.pageSize}
    />
  );
}

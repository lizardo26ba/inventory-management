import { ListPageSkeleton } from '../../ui/skeleton';

/** Esqueleto de la lista de empresas. */
export default function OrganizationsLoading(): React.ReactElement {
  return <ListPageSkeleton columns={7} />;
}

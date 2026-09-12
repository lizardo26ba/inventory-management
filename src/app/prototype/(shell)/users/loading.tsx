import { ListPageSkeleton } from '../../ui/skeleton';

/** Esqueleto de la lista de usuarios. */
export default function UsersLoading(): React.ReactElement {
  return <ListPageSkeleton columns={6} />;
}

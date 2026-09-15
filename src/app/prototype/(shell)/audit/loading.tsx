import { ListPageSkeleton } from '../../ui/skeleton';

/** Esqueleto de la bitácora. Tiene cuatro cifras arriba, como la vista. */
export default function AuditLoading(): React.ReactElement {
  return <ListPageSkeleton columns={5} summaryCards={4} />;
}

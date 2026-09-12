import { ListPageSkeleton } from '../../ui/skeleton';

/** Esqueleto de la bitácora. Tiene tres cifras arriba, no cuatro. */
export default function AuditLoading(): React.ReactElement {
  return <ListPageSkeleton columns={5} summaryCards={3} />;
}

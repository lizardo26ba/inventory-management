import { ListPageSkeleton } from '../../ui/skeleton';

/** Esqueleto de la lista de almacenes. No lleva cifras arriba, igual que la lista. */
export default function WarehousesLoading(): React.ReactElement {
  return <ListPageSkeleton columns={6} summaryCards={0} />;
}

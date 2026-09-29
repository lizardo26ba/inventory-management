import { ListPageSkeleton } from '@/components/ui/skeleton';

/** Esqueleto de la lista de almacenes. Sin cifras arriba, igual que la lista. */
export default function WarehousesLoading(): React.ReactElement {
  return <ListPageSkeleton columns={5} summaryCards={0} />;
}

import { ListPageSkeleton } from '../../ui/skeleton';

/** Esqueleto del catálogo de productos. */
export default function ProductsLoading(): React.ReactElement {
  return <ListPageSkeleton columns={6} />;
}

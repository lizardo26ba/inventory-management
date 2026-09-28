import { FormPageSkeleton } from '../../../ui/skeleton';

/** Esqueleto del alta de almacén. */
export default function NewWarehouseLoading(): React.ReactElement {
  return <FormPageSkeleton sections={2} fieldsPerSection={3} />;
}

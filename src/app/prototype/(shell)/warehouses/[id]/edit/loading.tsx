import { FormPageSkeleton } from '../../../../ui/skeleton';

/** Esqueleto de la edición de almacén. */
export default function EditWarehouseLoading(): React.ReactElement {
  return <FormPageSkeleton sections={2} fieldsPerSection={3} />;
}

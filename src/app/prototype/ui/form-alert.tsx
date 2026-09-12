/**
 * Aviso de error de un formulario entero.
 *
 * Va arriba y no junto a un campo porque habla de lo que falló al guardar, que
 * puede no pertenecer a ningún campo: una versión vencida, un permiso, la red.
 *
 * Lleva `role="alert"` para que un lector de pantalla lo anuncie en cuanto
 * aparece. Quien no mira la parte de arriba de la pantalla se enteraría cuando
 * ya no sirve.
 */

import { IconAlert } from './icons';

export function FormAlert({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <p
      role="alert"
      className="border-danger bg-danger-soft text-danger rounded-control flex items-start gap-2 border px-3 py-2 text-sm"
    >
      <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

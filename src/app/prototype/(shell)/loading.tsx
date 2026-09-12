import { DetailPageSkeleton } from '../ui/skeleton';

/**
 * Esqueleto del panel y de toda ruta del marco que no declare el suyo.
 *
 * Next lo muestra solo mientras la pantalla se prepara en el servidor. Si esa
 * preparación es instantánea no llega a verse, y eso también es correcto: un
 * esqueleto que parpadea molesta más que no ponerlo.
 */
export default function ShellLoading(): React.ReactElement {
  return <DetailPageSkeleton />;
}

import Link from 'next/link';

import { buttonClass } from '@/components/ui/button';
import { IconPlus, IconTrash } from '@/components/ui/icons';

import { CATALOG_PATH } from '../paths';
import { CatalogHeader, Specimen, SpecimenRow, requireEntry } from '../specimen';

export default function ButtonCatalogPage(): React.ReactElement {
  const entry = requireEntry('button');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Variantes"
        description="Principal para la acción que se espera, secundaria para las demás, peligro para lo que no se deshace."
        usage={`<button className={buttonClass({ variant: 'secondary', size: 'md' })}>…</button>`}
      >
        <SpecimenRow>
          <button type="button" className={buttonClass({ size: 'md' })}>
            Guardar
          </button>
          <button type="button" className={buttonClass({ variant: 'secondary', size: 'md' })}>
            Cancelar
          </button>
          <button type="button" className={buttonClass({ variant: 'danger', size: 'md' })}>
            Eliminar
          </button>
        </SpecimenRow>
      </Specimen>

      <Specimen
        title="Tamaños"
        description="El pequeño va en cabeceras y filas; el mediano, en formularios."
      >
        <SpecimenRow>
          <button type="button" className={buttonClass({ size: 'sm' })}>
            Pequeño
          </button>
          <button type="button" className={buttonClass({ size: 'md' })}>
            Mediano
          </button>
        </SpecimenRow>
      </Specimen>

      <Specimen title="Con icono">
        <SpecimenRow>
          <button type="button" className={buttonClass({ size: 'sm' })}>
            <IconPlus className="h-4 w-4" />
            Nuevo producto
          </button>
          <button type="button" className={buttonClass({ variant: 'danger', size: 'sm' })}>
            <IconTrash className="h-4 w-4" />
            Eliminar
          </button>
        </SpecimenRow>
      </Specimen>

      <Specimen title="Deshabilitado">
        <SpecimenRow>
          <button type="button" disabled className={buttonClass({ size: 'md' })}>
            Guardar
          </button>
          <button
            type="button"
            disabled
            className={buttonClass({ variant: 'secondary', size: 'md' })}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled
            className={buttonClass({ variant: 'danger', size: 'md' })}
          >
            Eliminar
          </button>
        </SpecimenRow>
      </Specimen>

      <Specimen
        title="Como enlace"
        description="La misma clase sobre un enlace: la acción de una cabecera navega, no envía."
        usage={`<Link href="…" className={buttonClass({ size: 'sm' })}>…</Link>`}
      >
        <Link href={CATALOG_PATH} className={buttonClass({ size: 'sm' })}>
          Volver al índice
        </Link>
      </Specimen>
    </>
  );
}

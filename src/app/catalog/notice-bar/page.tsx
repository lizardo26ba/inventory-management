import { EMPTY_STATE_LINK_CLASS } from '@/components/ui/empty-state';
import { IconShield } from '@/components/ui/icons';
import { NoticeBar } from '@/components/ui/notice-bar';

import { CatalogHeader, Specimen, requireEntry } from '../specimen';

export default function NoticeBarCatalogPage(): React.ReactElement {
  const entry = requireEntry('notice-bar');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Advertencia"
        description="Va a lo ancho bajo el encabezado y no se cierra: habla de la página entera."
        usage={`<NoticeBar>…</NoticeBar>`}
      >
        <NoticeBar>Tu contraseña vence en 3 días.</NoticeBar>
      </Specimen>

      <Specimen
        title="Peligro, con icono y acción"
        description="Para un alcance que no es el habitual, como trabajar con privilegio elevado."
        usage={`<NoticeBar tone="danger" icon={<IconShield … />} action={<button …>…</button>}>…</NoticeBar>`}
      >
        <NoticeBar
          tone="danger"
          icon={<IconShield className="h-4 w-4 shrink-0" />}
          action={
            <button type="button" className={EMPTY_STATE_LINK_CLASS}>
              Salir de la empresa
            </button>
          }
        >
          Estás dentro de Farmacia Los Altos como super administrador.
        </NoticeBar>
      </Specimen>
    </>
  );
}

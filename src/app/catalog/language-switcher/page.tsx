import { LanguageSwitcher } from '@/components/ui/language-switcher';

import { CatalogHeader, Specimen, requireEntry } from '../specimen';

export default function LanguageSwitcherCatalogPage(): React.ReactElement {
  const entry = requireEntry('language-switcher');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="En el encabezado"
        description="Bandera y dos letras; el nombre completo, en su propio idioma, vive en la lista. Se abre con Enter o las flechas y Escape cierra sin cambiar. Es el mismo que lleva el marco del catálogo."
        usage={`<LanguageSwitcher />`}
      >
        <LanguageSwitcher />
      </Specimen>
    </>
  );
}

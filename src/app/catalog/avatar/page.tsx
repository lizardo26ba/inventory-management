import { Avatar } from '@/components/ui/avatar';
import { Monogram } from '@/components/ui/monogram';

import { CatalogHeader, Specimen, SpecimenRow, requireEntry } from '../specimen';

/**
 * Una foto inventada, dibujada aquí mismo. Una dirección externa no pasaría el
 * linter, y una foto de una persona real no tiene por qué estar en el código.
 */
const SAMPLE_PHOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#8fb3d9"/><circle cx="20" cy="16" r="7" fill="#f3d9c4"/><rect x="8" y="26" width="24" height="16" rx="8" fill="#3c5a80"/></svg>',
  );

export default function AvatarCatalogPage(): React.ReactElement {
  const entry = requireEntry('avatar');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Avatar con iniciales"
        description="Sin foto, las dos primeras iniciales del nombre."
        usage={`<Avatar name="Ana Morales" />`}
      >
        <SpecimenRow>
          <Avatar name="Ana Morales" />
          <Avatar name="Luis" />
          <Avatar name="María José Pérez Soto" />
        </SpecimenRow>
      </Specimen>

      <Specimen
        title="Avatar con foto y tamaños"
        description="El tamaño se pasa por clase. Es decorativo: el nombre siempre va al lado en texto."
        usage={`<Avatar name="…" photoUrl={url} className="h-12 w-12" />`}
      >
        <SpecimenRow>
          <Avatar name="Ana Morales" photoUrl={SAMPLE_PHOTO} />
          <Avatar name="Ana Morales" photoUrl={SAMPLE_PHOTO} className="h-12 w-12" />
          <Avatar name="Ana Morales" className="h-12 w-12" />
        </SpecimenRow>
      </Specimen>

      <Specimen
        title="Monograma"
        description="Para lo que no es una persona, como una empresa. Dos caracteres del texto que recibe."
        usage={`<Monogram text="FL" />`}
      >
        <SpecimenRow>
          <Monogram text="FL" />
          <Monogram text="ac" />
          <Monogram text="Distribuidora" />
        </SpecimenRow>
      </Specimen>
    </>
  );
}

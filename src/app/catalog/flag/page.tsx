import { CountryFlag } from '@/components/ui/flag';

import { CatalogHeader, Specimen, SpecimenRow, requireEntry } from '../specimen';

/** Los países que la bandera sabe dibujar, y uno que no, para ver el sustituto. */
const SAMPLE_COUNTRIES = ['GT', 'MX', 'ES', 'US', 'XX'] as const;

export default function FlagCatalogPage(): React.ReactElement {
  const entry = requireEntry('flag');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Países"
        description="Un país sin dibujo propio recibe un círculo neutro en lugar de nada."
        usage={`<CountryFlag countryCode="GT" />`}
      >
        <SpecimenRow>
          {SAMPLE_COUNTRIES.map((code) => (
            <span key={code} className="flex items-center gap-2 text-sm">
              <CountryFlag countryCode={code} />
              <span className="font-mono text-xs">{code}</span>
            </span>
          ))}
        </SpecimenRow>
      </Specimen>

      <Specimen title="Tamaños" usage={`<CountryFlag countryCode="MX" className="h-8 w-8" />`}>
        <SpecimenRow>
          <CountryFlag countryCode="MX" className="h-4 w-4" />
          <CountryFlag countryCode="MX" />
          <CountryFlag countryCode="MX" className="h-8 w-8" />
        </SpecimenRow>
      </Specimen>
    </>
  );
}

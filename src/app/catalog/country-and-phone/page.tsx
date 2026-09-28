import { CatalogHeader, Specimen, requireEntry } from '../specimen';
import { CountryAndPhoneDemo } from './demo';

export default function CountryAndPhoneCatalogPage(): React.ReactElement {
  const entry = requireEntry('country-and-phone');

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="País que manda sobre el prefijo"
        description="El selector es propio para poder llevar banderas: se abre con Enter o las flechas, Escape cierra sin cambiar. El prefijo no se escribe; cambia con el país."
        usage={`<CountrySelect id="country" value={code} options={countries} onChange={setCode} />\n<PhoneField id="phone" prefix={prefix} value={phone} onChange={setPhone} />`}
      >
        <CountryAndPhoneDemo />
      </Specimen>
    </>
  );
}

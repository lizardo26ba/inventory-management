import QRCode from 'qrcode';

import { QrCode } from '@/components/ui/qr-code';

import { CatalogHeader, Specimen, requireEntry } from '../specimen';

/**
 * Un texto cualquiera, no una dirección `otpauth`: el catálogo no tiene por qué
 * parecerse a un alta de segundo factor, ni siquiera con un secreto inventado.
 */
const SAMPLE_CONTENT = 'Catálogo de componentes de Inventario';

export default async function QrCodeCatalogPage(): Promise<React.ReactElement> {
  const entry = requireEntry('qr-code');
  // Las mismas opciones que usa el alta del segundo factor.
  const svg = await QRCode.toString(SAMPLE_CONTENT, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
  });

  return (
    <>
      <CatalogHeader entry={entry} />

      <Specimen
        title="Código"
        description="El marco blanco va siempre, también en el tema oscuro: sin margen claro alrededor, muchas cámaras no lo leen."
        usage={`<QrCode svg={qrSvg} label="…" />`}
      >
        <QrCode svg={svg} label="Código QR de muestra" />
      </Specimen>
    </>
  );
}

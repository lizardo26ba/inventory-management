'use client';

/**
 * El QR y la clave del alta. Es de cliente solo porque lee el idioma elegido: el
 * dibujo y la clave llegan ya hechos del servidor.
 */

import { QrCode } from '@/components/ui/qr-code';
import { useCopy } from '@/lib/i18n';

export function TwoFactorSetupKey({
  qrSvg,
  manualKey,
}: {
  readonly qrSvg: string;
  readonly manualKey: string;
}): React.ReactElement {
  const copy = useCopy();

  return (
    <div>
      <h2 className="text-sm font-semibold">{copy.twoFactor.stepScan}</h2>
      <p className="text-text-muted mt-1 text-xs">{copy.twoFactor.stepScanHelp}</p>
      <div className="mt-4 flex justify-center">
        <QrCode svg={qrSvg} label={copy.twoFactor.qrLabel} />
      </div>
      <p className="text-text-muted mt-4 text-xs">{copy.twoFactor.manualKey}</p>
      {/* Por grupos que no se parten: quien la teclea en el teléfono va de
          cuatro en cuatro, y un grupo cortado entre dos líneas se salta. */}
      <p className="bg-surface-muted rounded-control mt-1 flex flex-wrap justify-center gap-x-2 px-3 py-2 font-mono text-sm select-all">
        {manualKey.split(' ').map((group, index) => (
          <span key={index} className="whitespace-nowrap">
            {group}
          </span>
        ))}
      </p>
    </div>
  );
}

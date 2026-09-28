/**
 * El código QR del alta del segundo factor.
 *
 * Recibe el dibujo ya hecho en el servidor, en SVG. Así el secreto que codifica
 * no pasa por ninguna biblioteca del navegador. ADR 0014.
 *
 * El marco blanco va siempre, también con el tema oscuro: un QR sin margen claro
 * a su alrededor no lo lee la cámara de muchos teléfonos.
 */

export function QrCode({
  svg,
  label,
}: {
  /** El SVG que genera `qrcode` en el servidor a partir de la dirección `otpauth`. */
  readonly svg: string;
  readonly label: string;
}): React.ReactElement {
  return (
    <div className="border-border rounded-card inline-block border bg-white p-3 text-black">
      <div
        role="img"
        aria-label={label}
        className="h-44 w-44 [&>svg]:h-full [&>svg]:w-full"
        // Lo dibuja nuestro servidor con una biblioteca fija y a partir de una
        // dirección que arma él mismo: aquí no entra texto de ninguna persona.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}

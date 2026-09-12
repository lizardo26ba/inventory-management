/**
 * Bandera de país, redonda.
 *
 * Dibujada como SVG y no con el emoji de bandera a propósito: Windows no dibuja
 * esos emoji como banderas, sino como dos letras, así que en la máquina de la
 * mayoría de la gente el emoji no serviría.
 *
 * Son simplificaciones, sin escudos ni estrellas contadas. A veinte píxeles y
 * recortada en redondo, un escudo es una mancha y trece franjas son un gris. Lo
 * que tiene que sobrevivir a ese tamaño es la disposición y el color, que es lo
 * que distingue una bandera de otra de un vistazo.
 *
 * La bandera nunca viaja sola: siempre lleva al lado el nombre del país o del
 * idioma. Un color no puede ser el único portador de significado.
 */

/** Todas se dibujan sobre el mismo lienzo cuadrado. */
const VIEW_BOX = '0 0 3 3';

function VerticalBands({ colors }: { readonly colors: readonly string[] }): React.ReactElement {
  return (
    <>
      {colors.map((color, index) => (
        <rect key={color + String(index)} x={index} y="0" width="1" height="3" fill={color} />
      ))}
    </>
  );
}

/**
 * Franjas horizontales de alto desigual. Los pesos son proporciones, no
 * píxeles, así que la bandera no depende del tamaño al que se dibuje.
 */
function HorizontalBands({
  bands,
}: {
  readonly bands: readonly (readonly [color: string, weight: number])[];
}): React.ReactElement {
  const total = bands.reduce((sum, [, weight]) => sum + weight, 0);
  let offset = 0;

  return (
    <>
      {bands.map(([color, weight], index) => {
        const height = (weight / total) * 3;
        const y = offset;
        offset += height;
        return (
          <rect
            key={color + String(index)}
            x="0"
            y={y}
            width="3"
            height={height}
            fill={color}
          />
        );
      })}
    </>
  );
}

/**
 * Estados Unidos. Seis franjas en lugar de trece y un cantón liso en lugar de
 * cincuenta estrellas: a este tamaño el original se convierte en un borrón
 * rosado, y lo que se reconoce es el cantón azul sobre las franjas rojas.
 */
function UnitedStates(): React.ReactElement {
  const RED = '#b22234';
  const WHITE = '#ffffff';
  const BLUE = '#3c3b6e';

  return (
    <>
      <rect x="0" y="0" width="3" height="3" fill={WHITE} />
      {[0, 1, 2].map((index) => (
        <rect key={index} x="0" y={index} width="3" height="0.5" fill={RED} />
      ))}
      <rect x="0" y="0" width="1.4" height="1.5" fill={BLUE} />
    </>
  );
}

const FLAGS: Record<string, React.ReactElement> = {
  GT: <VerticalBands colors={['#4997d0', '#ffffff', '#4997d0']} />,
  MX: <VerticalBands colors={['#006847', '#ffffff', '#ce1126']} />,
  // España: la franja amarilla es el doble de alta que cada roja.
  ES: (
    <HorizontalBands
      bands={[
        ['#aa151b', 1],
        ['#f1bf00', 2],
        ['#aa151b', 1],
      ]}
    />
  ),
  US: <UnitedStates />,
};

const UNKNOWN_FLAG = <VerticalBands colors={['#d4d4d8', '#e4e4e7', '#d4d4d8']} />;

export function CountryFlag({
  countryCode,
  className,
}: {
  readonly countryCode: string;
  readonly className?: string;
}): React.ReactElement {
  return (
    <span
      aria-hidden="true"
      className={`ring-border inline-block shrink-0 overflow-hidden rounded-full ring-1 ${
        className ?? 'h-5 w-5'
      }`}
    >
      <svg viewBox={VIEW_BOX} className="h-full w-full">
        {FLAGS[countryCode] ?? UNKNOWN_FLAG}
      </svg>
    </span>
  );
}

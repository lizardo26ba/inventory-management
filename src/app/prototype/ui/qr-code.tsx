/**
 * El código QR del alta del segundo factor, dibujado de mentira.
 *
 * En el prototipo no hay clave real que codificar, así que se dibuja un patrón
 * fijo con la forma de un QR: los tres cuadros de las esquinas y un relleno que
 * parece datos. Sirve para acordar tamaño, marco y lugar. No se puede escanear, y
 * lo dice en su texto alternativo.
 *
 * En la aplicación real este componente recibe el dibujo ya generado en el
 * servidor. La clave nunca viaja a una biblioteca del navegador.
 */

const MODULES = 25;
const FINDER = 7;

/** Relleno fijo, para que el dibujo no cambie en cada render. */
function isDark(row: number, column: number): boolean {
  // Una mezcla de enteros cualquiera: lo que importa es que no dibuje rayas.
  const mixed = Math.imul(row + 1, 0x9e3779b1) ^ Math.imul(column + 1, 0x85ebca77);
  return ((mixed ^ (mixed >>> 13)) >>> 0) % 7 < 3;
}

/** Las esquinas con su margen: ahí van los cuadros de posición, no relleno. */
function inFinder(row: number, column: number): boolean {
  const reserved = FINDER + 1;
  const top = row < reserved;
  const left = column < reserved;
  const right = column >= MODULES - reserved;
  const bottom = row >= MODULES - reserved;
  return (top && left) || (top && right) || (bottom && left);
}

function Finder({ x, y }: { readonly x: number; readonly y: number }): React.ReactElement {
  return (
    <g>
      <rect x={x} y={y} width={7} height={7} fill="currentColor" />
      <rect x={x + 1} y={y + 1} width={5} height={5} fill="white" />
      <rect x={x + 2} y={y + 2} width={3} height={3} fill="currentColor" />
    </g>
  );
}

export function QrCode({ label }: { readonly label: string }): React.ReactElement {
  const cells: React.ReactElement[] = [];
  for (let row = 0; row < MODULES; row += 1) {
    for (let column = 0; column < MODULES; column += 1) {
      if (inFinder(row, column) || !isDark(row, column)) continue;
      cells.push(<rect key={`${row}-${column}`} x={column} y={row} width={1} height={1} />);
    }
  }

  return (
    <div className="border-border rounded-card inline-block border bg-white p-3 text-black">
      <svg
        viewBox={`-1 -1 ${MODULES + 2} ${MODULES + 2}`}
        className="h-44 w-44"
        role="img"
        aria-label={label}
        shapeRendering="crispEdges"
      >
        <g fill="currentColor">{cells}</g>
        <Finder x={0} y={0} />
        <Finder x={MODULES - FINDER} y={0} />
        <Finder x={0} y={MODULES - FINDER} />
      </svg>
    </div>
  );
}

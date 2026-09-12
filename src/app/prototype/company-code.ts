/**
 * Código de la empresa.
 *
 * Lo asigna el sistema y no se puede escribir a mano, ni al crear ni al editar.
 * La razón es que este código encabeza el número de cada documento: factura,
 * orden de compra, traslado. Un dato que aparece impreso en miles de documentos
 * no puede cambiar ni depender de algo que cambie.
 *
 * Por eso no lleva el identificador fiscal ni el año. El identificador fiscal se
 * corrige cuando estaba mal escrito y es dato del contribuyente, no un rótulo
 * para imprimir; el año alarga el código sin distinguir nada, porque dos
 * empresas creadas el mismo año siguen necesitando códigos distintos. Lo que se
 * necesita es lo contrario: corto, estable y reconocible de un vistazo.
 *
 * Se deriva del nombre comercial una sola vez, al crear. Si luego la empresa se
 * cambia el nombre, el código se queda como estaba: renombrarlo obligaría a
 * renumerar la historia entera.
 */

const CODE_LENGTH = 4;
const FILLER = 'X';

/**
 * Palabras que no distinguen a una empresa de otra. Se descartan para que
 * "Almacenes del Sur" y "Almacenes de la Sur" den el mismo código.
 */
const CONNECTOR_WORDS = new Set([
  'DE',
  'DEL',
  'LA',
  'LAS',
  'EL',
  'LOS',
  'Y',
  'SA',
  'SRL',
  'CV',
]);

/** Quita acentos y todo lo que no sea letra: el código va impreso y viaja. */
function significantWords(tradeName: string): readonly string[] {
  return tradeName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter((word) => word !== '' && !CONNECTOR_WORDS.has(word));
}

/**
 * La inicial de la primera palabra y el arranque de la segunda. Es la forma en
 * que la gente abrevia un nombre al hablar, así que el código se reconoce sin
 * consultarlo: Distribuidora Central da DCEN.
 */
function baseCode(tradeName: string): string {
  const words = significantWords(tradeName);
  if (words.length === 0) return FILLER.repeat(CODE_LENGTH);

  const first = words[0] ?? '';
  const second = words[1];
  const raw = second === undefined ? first : first.slice(0, 1) + second;

  return raw.slice(0, CODE_LENGTH).padEnd(CODE_LENGTH, FILLER);
}

/**
 * El código definitivo, ya libre de choques.
 *
 * Dos empresas con nombres parecidos dan la misma base. La segunda lleva un
 * número detrás en lugar de alterar las letras, porque alterarlas rompería el
 * parecido con el nombre, que es justo lo que hace útil al código.
 */
export function buildCompanyCode(tradeName: string, takenCodes: readonly string[]): string {
  const base = baseCode(tradeName);
  const taken = new Set(takenCodes.map((code) => code.toUpperCase()));
  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base}${String(suffix)}`)) suffix += 1;
  return `${base}${String(suffix)}`;
}

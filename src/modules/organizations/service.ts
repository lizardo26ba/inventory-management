/**
 * Reglas del dominio de empresas.
 *
 * Sin Prisma y sin Next: aquí solo se decide. Lo que hace falta consultar llega
 * como argumento, de modo que estas funciones se prueban sin levantar nada.
 */

/** Longitud del código. Cuatro letras caben en un número de documento. */
const CODE_LENGTH = 4;

/** Relleno cuando el nombre no da para cuatro letras. */
const FILLER = 'X';

/**
 * Palabras que no distinguen a una empresa de otra. Se descartan para que
 * "Almacenes del Sur" y "Almacenes de la Sur" den el mismo código, y para que
 * la forma societaria no se coma las cuatro letras.
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
  'THE',
  'AND',
  'OF',
  'INC',
  'LTD',
]);

function significantWords(tradeName: string): readonly string[] {
  return tradeName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter((word) => word !== '' && !CONNECTOR_WORDS.has(word));
}

/**
 * La inicial de la primera palabra y el arranque de la segunda. Es como la gente
 * abrevia un nombre al hablar, así que el código se reconoce sin consultarlo:
 * "Distribuidora Central" da DCEN.
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
 * El código definitivo de una empresa, ya libre de choques.
 *
 * Lo asigna el sistema y no se puede escribir a mano, porque encabeza el número
 * de cada documento: factura, orden de compra, traslado. Un dato impreso en
 * miles de documentos no puede cambiar ni depender de algo que cambie, así que
 * no lleva el identificador fiscal, que se corrige, ni el año, que no distingue
 * nada.
 *
 * Dos empresas con nombres parecidos dan la misma base. La segunda lleva un
 * número detrás en lugar de alterar las letras: alterarlas rompería el parecido
 * con el nombre, que es justo lo que hace útil al código.
 *
 * Se guarda en minúsculas porque también es el trozo de la dirección web, y se
 * muestra en mayúsculas.
 */
export function buildOrganizationSlug(
  tradeName: string,
  takenSlugs: readonly string[],
): string {
  const base = baseCode(tradeName);
  const taken = new Set(takenSlugs.map((slug) => slug.toUpperCase()));

  if (!taken.has(base)) return base.toLowerCase();

  let suffix = 2;
  while (taken.has(`${base}${String(suffix)}`)) suffix += 1;
  return `${base}${String(suffix)}`.toLowerCase();
}

/**
 * Un mismo identificador fiscal se escribe de muchas formas: con guiones, con
 * puntos, con espacios o en minúsculas. Comparar el texto tal cual dejaría pasar
 * al mismo contribuyente escrito de dos maneras, que es justo lo que la
 * restricción de la base quiere evitar.
 */
export function normalizeTaxId(taxId: string): string {
  return taxId.replace(/[^0-9a-z]/gi, '').toUpperCase();
}

/**
 * Si el identificador encaja con el formato del país.
 *
 * El patrón viene del catálogo de países, no escrito aquí: cada administración
 * numera a su manera y esa es una regla de datos, no de código. Un país sin
 * patrón declarado acepta cualquier cosa, que es preferible a rechazar capturas
 * correctas de un país que todavía no se ha estudiado.
 */
export function matchesTaxIdPattern(taxId: string, pattern: string | null): boolean {
  if (pattern === null || pattern === '') return true;

  try {
    return new RegExp(pattern).test(taxId);
  } catch {
    // Un patrón mal escrito en el catálogo no puede impedir dar de alta una
    // empresa. Se deja pasar y el problema se arregla en el dato, no aquí.
    return true;
  }
}

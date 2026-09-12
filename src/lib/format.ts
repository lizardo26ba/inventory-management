/**
 * Formato de números y moneda del prototipo.
 *
 * Se declara aquí, y no en cada pantalla, porque el formato depende del idioma
 * y de la moneda de la organización. Cuando entren las traducciones reales,
 * estas funciones recibirán el idioma del usuario en lugar de suponerlo.
 *
 * Las cantidades van con separador de miles y dos decimales como máximo: una
 * tabla de inventario se lee comparando columnas, y sin alineación no se puede.
 */

const DEFAULT_LOCALE = 'en-US';

export function formatQuantity(value: number): string {
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatSignedQuantity(value: number): string {
  const formatted = formatQuantity(Math.abs(value));
  return value < 0 ? `- ${formatted}` : `+ ${formatted}`;
}

/**
 * Fecha corta, en tiempo universal.
 *
 * Se fija la zona a propósito: el servidor y el navegador deben dibujar la
 * misma cadena, o React avisa de una discrepancia. Cuando exista la preferencia
 * del usuario, esta función recibirá su zona y su idioma.
 */
export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(isoDate));
}

/** Fecha y hora cortas, en tiempo universal, por el mismo motivo que la fecha. */
export function formatDateTime(isoDate: string): string {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(new Date(isoDate));
}

/**
 * Formato de teléfono por país.
 *
 * Un número se escribe distinto en cada país, y quien lo teclea espera que el
 * campo se separe solo mientras escribe. Aquí no hay ninguna regla de un país
 * concreto: la plantilla viene del catálogo de países, así que añadir un país
 * nuevo no toca este archivo.
 *
 * Una plantilla vacía significa que ese país todavía no declara formato. En ese
 * caso el número se acepta tal como se teclee: rechazar capturas correctas por
 * un dato del catálogo que falta sería peor que no separar el número.
 *
 * Se guarda el número ya separado porque es lo que se va a mostrar. Los dígitos
 * sueltos se recuperan cuando hacen falta, que es al comparar y al validar.
 */

/** El carácter de la plantilla que representa un dígito. */
const DIGIT_PLACEHOLDER = '#';

export function digitsOf(text: string): string {
  return text.replace(/\D/g, '');
}

/** Cuántos dígitos admite un país. Cero cuando no declara formato. */
export function maxDigits(mask: string): number {
  return [...mask].filter((character) => character === DIGIT_PLACEHOLDER).length;
}

/**
 * Escribe los dígitos sobre la plantilla y corta donde se acaban.
 *
 * Cortar importa: si la plantilla se pintara entera, el campo mostraría los
 * separadores de los dígitos que todavía no se han escrito y el cursor
 * quedaría detrás de un espacio que nadie tecleó.
 */
export function applyPhoneMask(digits: string, mask: string): string {
  // Sin plantilla no hay nada que separar y tampoco un límite que aplicar.
  if (mask === '') return digits;

  const wanted = digits.slice(0, maxDigits(mask));
  if (wanted === '') return '';

  let result = '';
  let index = 0;

  for (const character of mask) {
    if (index >= wanted.length) break;
    if (character === DIGIT_PLACEHOLDER) {
      result += wanted[index];
      index += 1;
    } else {
      result += character;
    }
  }

  return result;
}

/** Si el número está completo para el país. El vacío no está incompleto: falta. */
export function isPhoneComplete(value: string, mask: string): boolean {
  // Un país sin formato declarado no puede decir que falten dígitos.
  if (mask === '') return true;
  return digitsOf(value).length === maxDigits(mask);
}

import { type Copy } from '@/lib/i18n';

/**
 * El nombre de una acción en el idioma de quien mira.
 *
 * Lo guardado es el código que se escribió el día de la operación, y el catálogo
 * de hoy puede no tenerlo: una acción retirada sigue en la base para siempre. En
 * ese caso se muestra el código, que dice algo, en lugar de un hueco. Una prueba
 * vigila que el catálogo y el diccionario no se separen mientras ambos existan.
 */
export function auditActionName(copy: Copy, action: string): string {
  const names: Readonly<Record<string, string>> = copy.auditActions;
  return names[action] ?? action;
}

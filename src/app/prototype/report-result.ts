import type { Copy } from '@/lib/i18n';

import { DemoOutcomeError } from './demo-outcome';
import type { ResultMessage } from './ui/result-dialog';

/** Las acciones que avisan de su resultado. Cada una tiene su frase en `copy.result`. */
export type ResultAction =
  | 'userSuspend'
  | 'userActivate'
  | 'userDelete'
  | 'companySuspend'
  | 'companyActivate'
  | 'companyDelete'
  | 'twoFactorReset';

/**
 * Ejecuta una acción y dice cómo terminó, con el diálogo de resultado.
 *
 * El texto nombra la acción y el registro: "Se suspendió la cuenta de Ana
 * Morales." Si salió bien añade la consecuencia; si no, el motivo. En la
 * aplicación real el motivo sale del código de error que devuelve la acción.
 */
export async function reportResult(
  show: (result: ResultMessage) => void,
  copy: Copy,
  action: ResultAction,
  name: string,
  operation: () => Promise<void>,
): Promise<void> {
  try {
    await operation();
    show({
      tone: 'success',
      message: `${copy.result[`${action}Done`]} ${name}. ${copy.result[`${action}Consequence`]}`,
    });
  } catch (error) {
    const isWarning = error instanceof DemoOutcomeError && error.tone === 'warning';
    show({
      tone: isWarning ? 'warning' : 'error',
      message: `${copy.result[`${action}Failed`]} ${name}. ${isWarning ? copy.result.changedMeanwhile : copy.errors.generic}`,
    });
  }
}

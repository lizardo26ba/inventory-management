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
  | 'twoFactorReset'
  | 'warehouseArchive'
  | 'warehouseActivate';

/**
 * Ejecuta una acción y dice cómo terminó, con el diálogo de resultado.
 *
 * El texto nombra la acción y el registro: "Se suspendió la cuenta de Ana
 * Morales." Si salió bien añade la consecuencia; si no, el motivo. En la
 * aplicación real el motivo sale del código de error que devuelve la acción.
 *
 * `reasonOf` es para los rechazos que tienen explicación propia, como archivar
 * un almacén con existencias. Si no reconoce el error, se dice el motivo
 * genérico: un rechazo por regla de negocio que se explica como "algo salió
 * mal" deja a la persona sin saber qué corregir.
 */
export async function reportResult(
  show: (result: ResultMessage) => void,
  copy: Copy,
  action: ResultAction,
  name: string,
  operation: () => Promise<void>,
  reasonOf?: (error: unknown) => string | undefined,
): Promise<void> {
  try {
    await operation();
    show({
      tone: 'success',
      message: `${copy.result[`${action}Done`]} ${name}. ${copy.result[`${action}Consequence`]}`,
    });
  } catch (error) {
    const isWarning = error instanceof DemoOutcomeError && error.tone === 'warning';
    const reason =
      reasonOf?.(error) ?? (isWarning ? copy.result.changedMeanwhile : copy.errors.generic);
    show({
      tone: isWarning ? 'warning' : 'error',
      message: `${copy.result[`${action}Failed`]} ${name}. ${reason}`,
    });
  }
}

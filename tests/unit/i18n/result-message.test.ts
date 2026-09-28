/**
 * El texto y el tono del diálogo de resultado.
 *
 * El tono lo decide el código que devolvió el servidor, no la pantalla que llama.
 * Si esta traducción se equivoca, una advertencia se ve como un fallo, o un fallo
 * como algo que salió bien, y eso es peor que no avisar.
 */

import { describe, expect, it } from 'vitest';

import { resultMessageFor } from '@/components/ui/result-dialog';
import { copyEs } from '@/lib/i18n/copy-es';

const NAME = 'Ana Morales';

describe('resultMessageFor', () => {
  it('si salió bien, dice qué se hizo, a quién y qué consecuencia tiene', () => {
    expect(resultMessageFor(copyEs, 'userSuspend', NAME, { ok: true })).toEqual({
      tone: 'success',
      message: 'Se suspendió la cuenta de Ana Morales. No podrá entrar hasta que la reactiven.',
    });
  });

  it.each(['STALE_VERSION', 'CONFLICT'] as const)(
    'si otra persona cambió el registro (%s), advierte en lugar de dar un fallo',
    (code) => {
      const result = resultMessageFor(copyEs, 'companyDelete', 'Farmacia Los Altos', {
        ok: false,
        error: { code },
      });

      expect(result.tone).toBe('warning');
      expect(result.message).toBe(
        `No se pudo eliminar la empresa Farmacia Los Altos. ${copyEs.result.changedMeanwhile}`,
      );
    },
  );

  it('si el registro ya no existe, también advierte', () => {
    const result = resultMessageFor(copyEs, 'userDelete', NAME, {
      ok: false,
      error: { code: 'NOT_FOUND' },
    });

    expect(result).toEqual({
      tone: 'warning',
      message: `No se pudo eliminar la cuenta de Ana Morales. ${copyEs.errors.notFound}`,
    });
  });

  it('un campo rechazado da error con el motivo de ese campo', () => {
    const result = resultMessageFor(copyEs, 'twoFactorReset', NAME, {
      ok: false,
      error: { code: 'VALIDATION_FAILED', fieldErrors: { id: 'cannotResetOwnTwoFactor' } },
    });

    expect(result).toEqual({
      tone: 'error',
      message: `No se pudo restablecer el segundo factor de Ana Morales. ${copyEs.fieldErrors.cannotResetOwnTwoFactor}`,
    });
  });

  it('un permiso que falta da error con su motivo', () => {
    const result = resultMessageFor(copyEs, 'userActivate', NAME, {
      ok: false,
      error: { code: 'NOT_AUTHORIZED' },
    });

    expect(result).toEqual({
      tone: 'error',
      message: `No se pudo reactivar la cuenta de Ana Morales. ${copyEs.errors.notAuthorized}`,
    });
  });

  it('un fallo interno da error genérico, sin detalle', () => {
    const result = resultMessageFor(copyEs, 'companySuspend', 'Farmacia Los Altos', {
      ok: false,
      error: { code: 'INTERNAL' },
    });

    expect(result).toEqual({
      tone: 'error',
      message: `No se pudo suspender la empresa Farmacia Los Altos. ${copyEs.errors.generic}`,
    });
  });
});

/**
 * El código del error tiene que llegar al navegador.
 *
 * Un error lanzado en un componente de servidor no cruza entero: en producción
 * Next.js sustituye el mensaje para no filtrar nada de dentro, y lo único que
 * respeta tal cual es `digest`. Sobre eso se sostiene la pantalla de error del
 * panel, que traduce el código en lugar de enseñar una frase del servidor.
 *
 * Es un supuesto sobre una pieza ajena, así que se fija aquí: si algún día
 * `digest` deja de ser el código, esta prueba cae antes que la pantalla, en
 * lugar de que el fallo aparezca como un mensaje genérico que nadie relaciona
 * con esto. RN-013, principio 6 de CLAUDE.md.
 */

import { describe, expect, it } from 'vitest';

import {
  AuthenticationError,
  AuthorizationError,
  InternalError,
  NotFoundError,
  TwoFactorRequiredError,
} from '@/lib/errors';

describe('el digest de un error es su código', () => {
  it('lo lleva el rechazo por falta de permiso', () => {
    expect(new AuthorizationError('Sin permiso.').digest).toBe('NOT_AUTHORIZED');
  });

  it('lo llevan también los demás errores esperados', () => {
    expect(new AuthenticationError('Sin sesión.').digest).toBe('NOT_AUTHENTICATED');
    expect(new TwoFactorRequiredError('Falta el segundo factor.').digest).toBe(
      'TWO_FACTOR_REQUIRED',
    );
    expect(new NotFoundError('No existe.').digest).toBe('NOT_FOUND');
  });

  it('un fallo interno dice solo que es interno', () => {
    // El detalle de un fallo no es asunto de quien lo encuentra: queda en el
    // registro del servidor, que es donde sirve.
    const error = new InternalError('La consulta falló en la tabla de sesiones.');

    expect(error.digest).toBe('INTERNAL');
  });

  it('está presente, que es lo que impide que Next.js escriba el suyo', () => {
    // Next.js solo calcula un digest propio cuando el error no trae ninguno.
    // Si este dejara de ser una cadena no vacía, el código se perdería.
    const error = new AuthorizationError('Sin permiso.');

    expect(typeof error.digest).toBe('string');
    expect(error.digest.length).toBeGreaterThan(0);
  });
});

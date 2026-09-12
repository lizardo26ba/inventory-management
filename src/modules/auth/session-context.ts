/**
 * Lo que el servidor sabe de quien pide algo.
 *
 * Es un archivo de solo tipos, sin importar nada. Así lo puede usar una función
 * que decide, como `landing.ts`, sin arrastrar consigo el cliente de la base ni
 * la marca de solo servidor, y esa función se puede probar sin levantar nada.
 *
 * Nada de esto viaja en la cookie: se vuelve a leer de la base en cada petición.
 * Ver `session.ts` y el ADR 0007.
 */

export type SessionContext = {
  readonly userId: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly locale: string;
  /** La empresa en la que se está trabajando, o ninguna todavía. */
  readonly organizationId: string | null;
  readonly isPlatformAdmin: boolean;
  /** Cierto mientras un super administrador opera en una empresa ajena. */
  readonly actingAsPlatformAdmin: boolean;
  readonly twoFactorVerifiedAt: Date | null;
  readonly mustChangePassword: boolean;
};

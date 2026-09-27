/**
 * Credenciales de la maqueta.
 *
 * ATENCIÓN: esto NO es autenticación. Es una comparación de texto en el
 * navegador, escrita para que el prototipo se pueda recorrer de punta a punta
 * sin servidor. Cualquiera que abra las herramientas del navegador las ve.
 *
 * No contradice la regla de cero valores quemados de CLAUDE.md porque no son un
 * secreto: no abren nada, no existen en ninguna base de datos y no se parecen a
 * ninguna credencial real. Se declaran aquí, en un único archivo con nombre
 * evidente, para que borrarlas sea un solo gesto.
 *
 * Este archivo se elimina cuando entre la autenticación real, junto con toda la
 * carpeta del prototipo.
 */

/**
 * Quién puede entrar en la maqueta, y con qué alcance.
 *
 * Hay tres cuentas porque hay tres caminos después del acceso, y cada uno se
 * tiene que poder recorrer: la plataforma, que empieza en la lista de empresas;
 * un miembro de varias empresas, que elige en cuál trabajar; y un miembro de una
 * sola, que entra directo porque no hay nada que elegir.
 */
export type DemoAccount = {
  readonly email: string;
  readonly password: string;
  readonly name: string;
  readonly initials: string;
  readonly isPlatformAdmin: boolean;
  /**
   * Si ya activó el segundo factor. Solo cuenta en la plataforma, que es la única
   * que lo lleva: sin él, al entrar se le pide activarlo. RN-005.
   */
  readonly hasTwoFactor: boolean;
  /** Empresas a las que pertenece, con el rol que tiene en cada una. */
  readonly memberships: readonly { readonly companyId: string; readonly roleCode: string }[];
};

/** La cuenta con la que arranca la maqueta si se abre sin pasar por el acceso. */
export const DEFAULT_DEMO_ACCOUNT: DemoAccount = {
  email: 'admin@gt.com',
  password: 'admin',
  name: 'Platform admin',
  initials: 'PA',
  isPlatformAdmin: true,
  hasTwoFactor: true,
  memberships: [],
};

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  DEFAULT_DEMO_ACCOUNT,
  {
    email: 'nuevo@gt.com',
    password: 'nuevo',
    name: 'Nuevo admin',
    initials: 'NA',
    isPlatformAdmin: true,
    hasTwoFactor: false,
    memberships: [],
  },
  {
    email: 'maria@gt.com',
    password: 'maria',
    name: 'María López',
    initials: 'ML',
    isPlatformAdmin: false,
    hasTwoFactor: false,
    memberships: [
      { companyId: 'c-01', roleCode: 'admin' },
      { companyId: 'c-02', roleCode: 'purchasing' },
      { companyId: 'c-03', roleCode: 'viewer' },
    ],
  },
  {
    email: 'luis@gt.com',
    password: 'luis',
    name: 'Luis Herrera',
    initials: 'LH',
    isPlatformAdmin: false,
    hasTwoFactor: false,
    memberships: [{ companyId: 'c-01', roleCode: 'sales' }],
  },
];

/**
 * El código que acepta la maqueta en lugar del de la app. En la aplicación real
 * cambia cada 30 segundos.
 */
export const DEMO_TWO_FACTOR_CODE = '123456';

/** La clave que se teclearía a mano si el QR no se puede escanear. */
export const DEMO_TWO_FACTOR_KEY = 'JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP';

export function findDemoAccount(email: string, password: string): DemoAccount | undefined {
  const normalized = email.trim().toLowerCase();
  return DEMO_ACCOUNTS.find(
    (account) => account.email === normalized && account.password === password,
  );
}

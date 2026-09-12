/**
 * Lo que el dominio de empresas entrega hacia fuera.
 *
 * Son objetos de transporte, no filas de la base. La diferencia importa: aquí no
 * aparece la versión optimista, ni la fecha de borrado, ni ninguna columna que
 * solo sirva dentro del repositorio. Lo que cruza esta frontera es lo que una
 * pantalla necesita para pintarse, y nada más.
 */

export type OrganizationListItem = {
  readonly id: string;
  /**
   * El código corto. Encabeza el número de cada documento, así que se guarda en
   * minúsculas por convención de direcciones y se muestra en mayúsculas.
   */
  readonly slug: string;
  readonly name: string;
  readonly legalName: string;
  readonly countryCode: string;
  readonly countryName: string;
  readonly baseCurrencyCode: string;
  readonly taxId: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  /** Cuánta gente alcanza esta empresa. Se cuenta, no se guarda. */
  readonly userCount: number;
  readonly warehouseCount: number;
};

/**
 * Las cifras de cabecera. Son de la plataforma entera y no las afecta la
 * búsqueda: es la única pantalla donde se mira por encima de una empresa.
 */
export type OrganizationsSummary = {
  readonly organizationCount: number;
  readonly userCount: number;
  readonly warehouseCount: number;
  readonly countryCount: number;
};

export type OrganizationPage = {
  readonly items: readonly OrganizationListItem[];
  /** Cuántas cumplen el filtro, no cuántas caben en la página. */
  readonly total: number;
};

/**
 * La ficha de una empresa.
 *
 * Lleva más que la fila de la lista porque es la pantalla donde se mira el
 * dato completo, y la versión porque desde aquí se edita: quien guarda tiene que
 * poder decir sobre qué versión trabajaba.
 */
export type OrganizationDetail = {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly legalName: string;
  readonly countryCode: string;
  readonly countryName: string;
  readonly baseCurrencyCode: string;
  readonly taxId: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly address: string | null;
  readonly timeZone: string;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly userCount: number;
  readonly warehouseCount: number;
  /** Contra qué versión se editó. Ver `updateOrganization` en el repositorio. */
  readonly version: number;
};

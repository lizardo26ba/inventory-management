/**
 * Lo que el dominio de almacenes entrega hacia fuera.
 *
 * Son objetos de transporte, no filas de la base: no llevan la empresa, que la
 * pantalla ya conoce por la sesión, ni la fecha de borrado, ni nada que solo
 * sirva dentro del repositorio.
 */

export type WarehouseListItem = {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly address: string | null;
  readonly countryCode: string;
  readonly countryName: string;
  /** Identificador de la base de zonas horarias, como America/Guatemala. */
  readonly timeZone: string;
  readonly isActive: boolean;
};

/** La ficha para editar. Lleva la versión contra la que se guardará. */
export type WarehouseDetail = WarehouseListItem & {
  readonly version: number;
};

/**
 * Un país que se puede elegir para un almacén, con sus zonas horarias.
 *
 * Hoy el catálogo guarda una sola zona por país, la de omisión, así que la lista
 * tiene un elemento. Un país con varias zonas, como México, necesitará que el
 * catálogo las declare; la pantalla ya elige entre varias y no cambiará.
 */
export type WarehouseCountryOption = {
  readonly code: string;
  readonly name: string;
  /** Lo pide el selector de país compartido para pintar la bandera y el prefijo. */
  readonly phonePrefix: string;
  readonly timeZones: readonly string[];
};

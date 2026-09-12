/**
 * Lo que el dominio de usuarios entrega a las pantallas.
 *
 * Son datos ya resueltos: nombres de empresa y de rol en lugar de
 * identificadores, y recuentos ya contados. Una pantalla no vuelve a preguntar a
 * la base para poder dibujar una fila.
 *
 * Aquí no aparece la huella de la contraseña, ni el secreto del segundo factor,
 * ni los intentos fallidos. Nada de eso se dibuja, así que nada de eso sale del
 * repositorio.
 */

/** El acceso de una persona a una empresa, tal como se ve en una lista. */
export type UserAccess = {
  readonly organizationId: string;
  readonly organizationName: string;
  readonly organizationSlug: string;
  readonly countryCode: string;
  readonly roleId: string;
  /** Código del rol del sistema, o nulo si la empresa creó el rol. */
  readonly roleCode: string | null;
  /** Nombre guardado del rol. Se usa cuando no hay código que traducir. */
  readonly roleName: string;
};

export type UserStatus = 'INVITED' | 'ACTIVE' | 'SUSPENDED';

export type UserListItem = {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly countryCode: string | null;
  readonly countryName: string | null;
  readonly status: UserStatus;
  readonly isPlatformAdmin: boolean;
  readonly createdAt: Date;
  readonly accesses: readonly UserAccess[];
};

export type UserPage = {
  readonly items: readonly UserListItem[];
  readonly total: number;
};

/** Las cifras de cabecera. De la plataforma entera, no de la búsqueda. */
export type UsersSummary = {
  readonly userCount: number;
  readonly activeCount: number;
  /** Empresas que alcanza al menos una persona. */
  readonly organizationsReached: number;
  /** Cuántas personas tienen el rol de administrador en alguna empresa. */
  readonly administratorCount: number;
};

export type UserDetail = UserListItem & {
  readonly version: number;
  /** Motivo de la concesión de plataforma, o nulo si no la tiene. */
  readonly platformAdminReason: string | null;
  readonly mustChangePassword: boolean;
  readonly lastLoginAt: Date | null;
};

/** Una empresa, como se ofrece en el selector de accesos del formulario. */
export type OrganizationChoice = {
  readonly id: string;
  readonly name: string;
  readonly countryCode: string;
  readonly roles: readonly RoleChoice[];
};

export type RoleChoice = {
  readonly id: string;
  /** Código del rol del sistema, o nulo si lo creó la empresa. */
  readonly code: string | null;
  readonly name: string;
};

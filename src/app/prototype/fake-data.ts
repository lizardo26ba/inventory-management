/**
 * Datos ficticios del prototipo.
 *
 * Existen solo para que las pantallas se vean con contenido realista mientras se
 * acuerda el diseño. No hay base de datos ni Prisma detrás. Cuando entren los
 * módulos de negocio este archivo se borra y las pantallas reciben los datos de
 * su capa de servicio.
 *
 * Nombres, correos y cantidades son inventados a propósito: nunca se usan datos
 * reales en el código. CLAUDE.md, Definition of Done.
 */

export type TrackingMode = 'NONE' | 'LOT' | 'SERIAL';
export type StockStatus = 'ok' | 'low' | 'out';
export type MovementKind = 'entry' | 'exit' | 'transfer' | 'adjustment';

export type Organization = {
  readonly id: string;
  readonly name: string;
  readonly countryCode: string;
  readonly currency: string;
};

export type CurrentUser = {
  readonly name: string;
  readonly email: string;
  readonly roleLabel: string;
  readonly initials: string;
};

export type Product = {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly category: string;
  readonly tracking: TrackingMode;
  readonly onHand: number;
  readonly minimum: number;
  readonly unit: string;
  readonly averageCost: number;
  readonly active: boolean;
};

export type Movement = {
  readonly id: string;
  readonly kind: MovementKind;
  readonly productName: string;
  readonly quantity: number;
  readonly warehouse: string;
  readonly reference: string;
  readonly happenedAt: string;
  readonly userName: string;
};

export const organizations: readonly Organization[] = [
  { id: 'org-1', name: 'Distribuidora Central', countryCode: 'GT', currency: 'GTQ' },
  { id: 'org-2', name: 'Almacenes del Sur', countryCode: 'GT', currency: 'GTQ' },
];

export const activeOrganization: Organization = organizations[0]!;

export const currentUser: CurrentUser = {
  name: 'Platform admin',
  email: 'admin@gt.com',
  roleLabel: 'Platform administrator',
  initials: 'PA',
};

export const products: readonly Product[] = [
  {
    id: 'p-01',
    code: 'MED-0142',
    name: 'Amoxicillin 500 mg, box of 21',
    category: 'Pharmacy',
    tracking: 'LOT',
    onHand: 340,
    minimum: 120,
    unit: 'box',
    averageCost: 38.5,
    active: true,
  },
  {
    id: 'p-02',
    code: 'MED-0207',
    name: 'Ibuprofen 400 mg, box of 30',
    category: 'Pharmacy',
    tracking: 'LOT',
    onHand: 86,
    minimum: 150,
    unit: 'box',
    averageCost: 24.9,
    active: true,
  },
  {
    id: 'p-03',
    code: 'EQP-1011',
    name: 'Digital blood pressure monitor',
    category: 'Equipment',
    tracking: 'SERIAL',
    onHand: 12,
    minimum: 5,
    unit: 'unit',
    averageCost: 615,
    active: true,
  },
  {
    id: 'p-04',
    code: 'EQP-1044',
    name: 'Infrared thermometer',
    category: 'Equipment',
    tracking: 'SERIAL',
    onHand: 0,
    minimum: 8,
    unit: 'unit',
    averageCost: 289,
    active: true,
  },
  {
    id: 'p-05',
    code: 'CON-3301',
    name: 'Nitrile gloves, size M, box of 100',
    category: 'Consumables',
    tracking: 'NONE',
    onHand: 1240,
    minimum: 400,
    unit: 'box',
    averageCost: 74.2,
    active: true,
  },
  {
    id: 'p-06',
    code: 'CON-3318',
    name: 'Surgical mask, box of 50',
    category: 'Consumables',
    tracking: 'NONE',
    onHand: 95,
    minimum: 300,
    unit: 'box',
    averageCost: 31.75,
    active: true,
  },
  {
    id: 'p-07',
    code: 'CON-3402',
    name: 'Isopropyl alcohol 70 percent, 1 L',
    category: 'Consumables',
    tracking: 'LOT',
    onHand: 512,
    minimum: 200,
    unit: 'bottle',
    averageCost: 18.4,
    active: true,
  },
  {
    id: 'p-08',
    code: 'OFI-5002',
    name: 'Thermal paper roll 80 mm',
    category: 'Office',
    tracking: 'NONE',
    onHand: 64,
    minimum: 40,
    unit: 'roll',
    averageCost: 9.9,
    active: false,
  },
];

export const recentMovements: readonly Movement[] = [
  {
    id: 'm-01',
    kind: 'entry',
    productName: 'Nitrile gloves, size M, box of 100',
    quantity: 400,
    warehouse: 'Main warehouse',
    reference: 'PO-GT-000184',
    happenedAt: 'Today, 09:42',
    userName: 'Ana Morales',
  },
  {
    id: 'm-02',
    kind: 'exit',
    productName: 'Amoxicillin 500 mg, box of 21',
    quantity: 60,
    warehouse: 'Main warehouse',
    reference: 'SO-GT-000971',
    happenedAt: 'Today, 08:15',
    userName: 'Luis Herrera',
  },
  {
    id: 'm-03',
    kind: 'transfer',
    productName: 'Isopropyl alcohol 70 percent, 1 L',
    quantity: 120,
    warehouse: 'Main to Branch north',
    reference: 'TR-GT-000052',
    happenedAt: 'Yesterday, 16:30',
    userName: 'Ana Morales',
  },
  {
    id: 'm-04',
    kind: 'adjustment',
    productName: 'Surgical mask, box of 50',
    quantity: -5,
    warehouse: 'Branch north',
    reference: 'ADJ-GT-000019',
    happenedAt: 'Yesterday, 11:05',
    userName: 'Sofia Cabrera',
  },
  {
    id: 'm-05',
    kind: 'exit',
    productName: 'Digital blood pressure monitor',
    quantity: 3,
    warehouse: 'Main warehouse',
    reference: 'SO-GT-000968',
    happenedAt: 'Yesterday, 10:12',
    userName: 'Luis Herrera',
  },
];

export const overviewMetrics = {
  stockValue: 486_312.4,
  lowStockCount: 3,
  expiringSoonCount: 7,
  pendingReceiptsCount: 4,
} as const;

/** Un producto está bajo mínimo cuando no llega a su nivel de reposición. */
export function stockStatusOf(product: Product): StockStatus {
  if (product.onHand <= 0) return 'out';
  if (product.onHand < product.minimum) return 'low';
  return 'ok';
}

export type Company = {
  readonly id: string;
  readonly name: string;
  readonly legalName: string;
  readonly code: string;
  readonly countryCode: string;
  readonly countryName: string;
  readonly currency: string;
  readonly userCount: number;
  readonly warehouseCount: number;
  readonly active: boolean;
  /** Instante de alta, en tiempo universal. Se presenta en la zona de quien mira. */
  readonly createdAt: string;
  /** Quién dio de alta la empresa. Es un dato de auditoría, no de contacto. */
  readonly createdByEmail: string;
  /** Datos que solo se ven al editar. Las empresas de ejemplo no los traen. */
  readonly taxId?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly address?: string;
};

const BASE_COMPANIES = [
  {
    id: 'c-01',
    name: 'Distribuidora Central',
    legalName: 'Distribuidora Central, Sociedad Anonima',
    code: 'DCEN',
    countryCode: 'GT',
    countryName: 'Guatemala',
    taxId: '2400237-1',
    currency: 'GTQ',
    userCount: 14,
    warehouseCount: 3,
    active: true,
  },
  {
    id: 'c-02',
    name: 'Almacenes del Sur',
    legalName: 'Almacenes del Sur, Sociedad Anonima',
    code: 'ASUR',
    countryCode: 'GT',
    countryName: 'Guatemala',
    taxId: '2400374-2',
    currency: 'GTQ',
    userCount: 6,
    warehouseCount: 2,
    active: true,
  },
  {
    id: 'c-03',
    name: 'Farmacia Los Altos',
    legalName: 'Farmacia Los Altos, Sociedad Anonima',
    code: 'FALT',
    countryCode: 'GT',
    countryName: 'Guatemala',
    taxId: '2400511-3',
    currency: 'GTQ',
    userCount: 3,
    warehouseCount: 1,
    active: false,
  },
  {
    id: 'c-04',
    name: 'Ferreteria El Progreso',
    legalName: 'Ferreteria El Progreso, Sociedad Anonima',
    code: 'FPRO',
    countryCode: 'GT',
    countryName: 'Guatemala',
    taxId: '2400648-4',
    currency: 'GTQ',
    userCount: 9,
    warehouseCount: 2,
    active: true,
  },
  {
    id: 'c-05',
    name: 'Comercial Xelaju',
    legalName: 'Comercial Xelaju, Sociedad Anonima',
    code: 'CXEL',
    countryCode: 'GT',
    countryName: 'Guatemala',
    taxId: '2400785-5',
    currency: 'GTQ',
    userCount: 5,
    warehouseCount: 1,
    active: true,
  },
  {
    id: 'c-06',
    name: 'Importadora del Pacifico',
    legalName: 'Importadora del Pacifico, Sociedad Anonima',
    code: 'IPAC',
    countryCode: 'GT',
    countryName: 'Guatemala',
    taxId: '2400922-6',
    currency: 'USD',
    userCount: 21,
    warehouseCount: 4,
    active: true,
  },
  {
    id: 'c-07',
    name: 'Agroinsumos Peten',
    legalName: 'Agroinsumos Peten, Sociedad Anonima',
    code: 'APET',
    countryCode: 'GT',
    countryName: 'Guatemala',
    taxId: '2401059-7',
    currency: 'GTQ',
    userCount: 7,
    warehouseCount: 2,
    active: true,
  },
  {
    id: 'c-08',
    name: 'Textiles Antigua',
    legalName: 'Textiles Antigua, Sociedad Anonima',
    code: 'TANT',
    countryCode: 'GT',
    countryName: 'Guatemala',
    taxId: '2401196-8',
    currency: 'GTQ',
    userCount: 11,
    warehouseCount: 2,
    active: true,
  },
  {
    id: 'c-09',
    name: 'Suministros Medicos Quetzal',
    legalName: 'Suministros Medicos Quetzal, Sociedad Anonima',
    code: 'SMED',
    countryCode: 'GT',
    countryName: 'Guatemala',
    taxId: '2401333-9',
    currency: 'GTQ',
    userCount: 4,
    warehouseCount: 1,
    active: false,
  },
  {
    id: 'c-10',
    name: 'Distribuidora Izabal',
    legalName: 'Distribuidora Izabal, Sociedad Anonima',
    code: 'DIZA',
    countryCode: 'GT',
    countryName: 'Guatemala',
    taxId: '2401470-0',
    currency: 'GTQ',
    userCount: 8,
    warehouseCount: 3,
    active: true,
  },
  {
    id: 'c-11',
    name: 'Electronica Mixco',
    legalName: 'Electronica Mixco, Sociedad Anonima',
    code: 'EMIX',
    countryCode: 'GT',
    countryName: 'Guatemala',
    taxId: '2401607-1',
    currency: 'GTQ',
    userCount: 6,
    warehouseCount: 1,
    active: true,
  },
  {
    id: 'c-12',
    name: 'Cafe de Altura Exportadora',
    legalName: 'Cafe de Altura Exportadora, Sociedad Anonima',
    code: 'CALT',
    countryCode: 'GT',
    countryName: 'Guatemala',
    taxId: '2401744-2',
    currency: 'USD',
    userCount: 17,
    warehouseCount: 3,
    active: true,
  },
  {
    id: 'c-13',
    name: 'Papeleria Escuintla',
    legalName: 'Papeleria Escuintla, Sociedad Anonima',
    code: 'PESC',
    countryCode: 'GT',
    countryName: 'Guatemala',
    taxId: '2401881-3',
    currency: 'GTQ',
    userCount: 2,
    warehouseCount: 1,
    active: true,
  },
  {
    id: 'c-14',
    name: 'Repuestos Zacapa',
    legalName: 'Repuestos Zacapa, Sociedad Anonima',
    code: 'RZAC',
    countryCode: 'GT',
    countryName: 'Guatemala',
    taxId: '2402018-4',
    currency: 'GTQ',
    userCount: 5,
    warehouseCount: 2,
    active: false,
  },
  {
    id: 'c-15',
    name: 'Abarrotes del Bajio',
    legalName: 'Abarrotes del Bajio, Sociedad Anonima de Capital Variable',
    code: 'ABAJ',
    countryCode: 'MX',
    countryName: 'Mexico',
    taxId: 'ABA9040415B1',
    currency: 'MXN',
    userCount: 26,
    warehouseCount: 5,
    active: true,
  },
  {
    id: 'c-16',
    name: 'Farmacias Monterrey',
    legalName: 'Farmacias Monterrey, Sociedad Anonima de Capital Variable',
    code: 'FMON',
    countryCode: 'MX',
    countryName: 'Mexico',
    taxId: 'FMT9050415C2',
    currency: 'MXN',
    userCount: 34,
    warehouseCount: 6,
    active: true,
  },
  {
    id: 'c-17',
    name: 'Refacciones Guadalajara',
    legalName: 'Refacciones Guadalajara, Sociedad Anonima de Capital Variable',
    code: 'RGUA',
    countryCode: 'MX',
    countryName: 'Mexico',
    taxId: 'RGD9060415D3',
    currency: 'MXN',
    userCount: 12,
    warehouseCount: 3,
    active: true,
  },
  {
    id: 'c-18',
    name: 'Insumos Medicos Puebla',
    legalName: 'Insumos Medicos Puebla, Sociedad Anonima de Capital Variable',
    code: 'IMED',
    countryCode: 'MX',
    countryName: 'Mexico',
    taxId: 'IMP9070415E4',
    currency: 'MXN',
    userCount: 9,
    warehouseCount: 2,
    active: true,
  },
  {
    id: 'c-19',
    name: 'Textiles Yucatan',
    legalName: 'Textiles Yucatan, Sociedad Anonima de Capital Variable',
    code: 'TYUC',
    countryCode: 'MX',
    countryName: 'Mexico',
    taxId: 'TYU9080415F5',
    currency: 'MXN',
    userCount: 7,
    warehouseCount: 2,
    active: false,
  },
  {
    id: 'c-20',
    name: 'Comercializadora Tijuana',
    legalName: 'Comercializadora Tijuana, Sociedad Anonima de Capital Variable',
    code: 'CTIJ',
    countryCode: 'MX',
    countryName: 'Mexico',
    taxId: 'CTI9090415G6',
    currency: 'USD',
    userCount: 18,
    warehouseCount: 4,
    active: true,
  },
  {
    id: 'c-21',
    name: 'Agroquimicos Sinaloa',
    legalName: 'Agroquimicos Sinaloa, Sociedad Anonima de Capital Variable',
    code: 'ASIN',
    countryCode: 'MX',
    countryName: 'Mexico',
    taxId: 'ASI9100415H7',
    currency: 'MXN',
    userCount: 15,
    warehouseCount: 4,
    active: true,
  },
  {
    id: 'c-22',
    name: 'Electronica Queretaro',
    legalName: 'Electronica Queretaro, Sociedad Anonima de Capital Variable',
    code: 'EQUE',
    countryCode: 'MX',
    countryName: 'Mexico',
    taxId: 'EQR9110415A8',
    currency: 'MXN',
    userCount: 11,
    warehouseCount: 2,
    active: true,
  },
];

/**
 * Quiénes dieron de alta las empresas de ejemplo, y cuándo.
 *
 * Se derivan del índice en lugar de escribirse empresa por empresa: son datos
 * de relleno, no información que se esté acordando. Las fechas son fijas y no
 * relativas a hoy, para que dos personas mirando el prototipo vean lo mismo.
 */
const SEED_CREATORS = [
  'admin@gt.com',
  'ana.morales@example.com',
  'luis.herrera@example.com',
  'sofia.cabrera@example.com',
] as const;

const SEED_FIRST_CREATION = Date.UTC(2024, 0, 15);
const DAYS_BETWEEN_SEED_CREATIONS = 23;
const MILLISECONDS_PER_DAY = 86_400_000;

export const companies: readonly Company[] = BASE_COMPANIES.map((company, index) => ({
  ...company,
  createdAt: new Date(
    SEED_FIRST_CREATION + index * DAYS_BETWEEN_SEED_CREATIONS * MILLISECONDS_PER_DAY,
  ).toISOString(),
  createdByEmail: SEED_CREATORS[index % SEED_CREATORS.length] ?? SEED_CREATORS[0],
}));

export type CountryOption = {
  readonly code: string;
  readonly name: string;
  /** Cómo llama cada país a su número de contribuyente. */
  readonly taxIdLabel: string;
  readonly phonePrefix: string;
  /**
   * Cómo se escribe un número nacional en este país. La almohadilla es un
   * dígito y el resto son separadores que pone el formulario solo.
   *
   * De la plantilla salen las tres cosas que necesita el campo: cuántos dígitos
   * caben, dónde van los espacios y qué ejemplo mostrar. Guardar solo la
   * longitud obligaría a repetir la separación en otro sitio.
   */
  readonly phoneMask: string;
  /** Un número de ejemplo, ya separado, para el texto de ayuda. */
  readonly phoneExample: string;
  readonly defaultCurrency: string;
};

/** Opciones del formulario de empresa. En la aplicación real vienen sembradas. */
export const countryOptions: readonly CountryOption[] = [
  {
    code: 'GT',
    name: 'Guatemala',
    taxIdLabel: 'NIT',
    phonePrefix: '+502',
    phoneMask: '#### ####',
    phoneExample: '5555 4444',
    defaultCurrency: 'GTQ',
  },
  {
    code: 'MX',
    name: 'Mexico',
    taxIdLabel: 'RFC',
    phonePrefix: '+52',
    phoneMask: '## #### ####',
    phoneExample: '55 1234 5678',
    defaultCurrency: 'MXN',
  },
];

export function findCountry(code: string): CountryOption | undefined {
  return countryOptions.find((country) => country.code === code);
}

export const currencyOptions = [
  { code: 'GTQ', name: 'Guatemalan quetzal' },
  { code: 'MXN', name: 'Mexican peso' },
  { code: 'USD', name: 'United States dollar' },
] as const;

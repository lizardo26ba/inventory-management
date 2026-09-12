/**
 * Textos del prototipo.
 *
 * Ninguna pantalla escribe texto suelto en el JSX. Las claves están agrupadas
 * igual que lo estarán en el catálogo de traducciones definitivo, así que el
 * paso a traducciones reales es mecánico: este archivo se convierte en el
 * diccionario del idioma inglés y copy.nav.products pasa a t('nav.products').
 *
 * El idioma por defecto es inglés. RN-011, RN-013.
 *
 * Este archivo es el catálogo inglés y además la fuente del tipo Copy, que es
 * la forma que todo idioma debe cumplir. Por eso el español no se escribe
 * suelto: se declara como Copy y el compilador rechaza una clave de menos, una
 * de más o una mal escrita. Los textos se leen con useCopy, nunca importando
 * este objeto: importarlo devolvería inglés aunque la persona hubiera elegido
 * español.
 */
export const copyEn = {
  app: {
    name: 'Inventory',
    prototypeNotice: 'Design prototype. The data shown is fictional and no action is saved.',
  },

  /**
   * Estados de espera. Son textos para lectores de pantalla: el indicador que
   * gira no lo ve todo el mundo, y sin estas frases la espera es silenciosa.
   */
  feedback: {
    loadingPage: 'Loading page',
    loadingTable: 'Updating results',
    working: 'Working',
    saving: 'Saving',
    deleting: 'Deleting',
    updating: 'Updating',
  },

  /**
   * Motivos de rechazo de un campo. Las claves son las que devuelven los
   * esquemas Zod, y este es el único sitio donde se convierten en frase.
   */
  fieldErrors: {
    required: 'This field is required.',
    invalidEmail: 'That does not look like an email address.',
    tooLong: 'That is too long.',
    tooShort: 'Use at least 12 characters.',
    mismatch: 'The two passwords do not match.',
    unchanged: 'Choose a password different from the current one.',
    wrongPassword: 'That is not your current password.',
    unknownCountry: 'Pick a country from the list.',
    incompletePhone: 'That number is not complete for the country you chose.',
    invalidTaxId: 'That does not match the tax number format for this country.',
    duplicateTaxId: 'Another company in this country already uses it.',
    emailTaken: 'Another account already uses this email.',
    tooMany: 'That is more than this field accepts.',
    duplicatedOrganization: 'A company appears twice in the access list.',
    unknownOrganization: 'One of those companies no longer exists. Reload the page.',
    roleNotInOrganization: 'That role belongs to another company. Reload the page.',
    cannotRevokeOwnPlatformAccess:
      'You cannot take platform access away from your own account. Ask another super administrator.',
  },

  /** Lo que se enseña cuando una operación entera falla. */
  errors: {
    generic: 'Something went wrong. Try again.',
    tooManyAttempts: 'Too many failed attempts. Wait a few minutes and try again.',
    sessionExpired: 'Your session expired. Sign in again.',
    notAuthorized: 'You do not have permission to do that.',
    notFound: 'That no longer exists. Refresh the page.',
    staleVersion:
      'Someone else changed this company while you were editing. Reload to see their changes.',
  },

  changePassword: {
    title: 'Change your password',
    subtitle: 'Your account still uses the password someone else gave you.',
    forced: 'You cannot go any further until you choose your own.',
    current: 'Current password',
    next: 'New password',
    confirm: 'Repeat the new password',
    rule: 'At least 12 characters.',
    submit: 'Change password',
    otherSessions: 'Changing it signs out your other devices.',
  },

  /** Cuando se entra bien pero no hay ninguna empresa a la que llegar. */
  notFoundPage: {
    message:
      'We could not find that page. It may have been deleted, or the address may be wrong.',
    back: 'Back to the start',
  },

  noAccess: {
    title: 'No company yet',
    body: 'Your account works, but nobody has granted it access to a company. Ask whoever administers the platform.',
  },

  nav: {
    sectionOperation: 'Operation',
    sectionAdministration: 'Administration',
    overview: 'Overview',
    products: 'Products',
    stock: 'Stock',
    warehouses: 'Warehouses',
    purchases: 'Purchases',
    sales: 'Sales',
    organizations: 'Companies',
    users: 'Users',
    audit: 'Audit log',
  },

  shell: {
    openMenu: 'Open navigation',
    closeMenu: 'Close navigation',
    switchCompany: 'Switch company',
    switchTheme: 'Switch theme',
    switchLanguage: 'Change language',
    search: 'Search',
    searchPlaceholder: 'Search products, orders or documents',
    account: 'Account',
  },

  overview: {
    title: 'Overview',
    subtitle: 'Current state of your inventory.',
    stockValue: 'Stock value',
    lowStock: 'Below minimum',
    expiringSoon: 'Expiring within 30 days',
    pendingReceipts: 'Pending receipts',
    lowStockTitle: 'Products below minimum',
    lowStockEmpty: 'Every product is above its minimum level.',
    recentTitle: 'Recent movements',
    viewAll: 'View all',
  },

  products: {
    title: 'Products',
    subtitle: 'Catalog of every item you buy, store and sell.',
    create: 'New product',
    filters: 'Filters',
    searchPlaceholder: 'Search by code or name',
    columnCode: 'Code',
    columnName: 'Product',
    columnCategory: 'Category',
    columnTracking: 'Tracking',
    columnStock: 'On hand',
    columnCost: 'Average cost',
    columnStatus: 'Status',
    resultCount: 'products',
    empty: 'No product matches this search.',
  },

  tracking: {
    none: 'None',
    lot: 'Lot',
    serial: 'Serial',
  },

  status: {
    active: 'Active',
    inactive: 'Inactive',
    ok: 'In stock',
    low: 'Low',
    out: 'Out of stock',
  },

  movement: {
    entry: 'Entry',
    exit: 'Exit',
    transfer: 'Transfer',
    adjustment: 'Adjustment',
  },

  pagination: {
    first: 'First page',
    previous: 'Previous',
    next: 'Next',
    last: 'Last page',
    rowsPerPage: 'Rows',
    showing: 'Showing',
    of: 'of',
    page: 'Page',
  },

  login: {
    title: 'Sign in',
    subtitle: 'Use the credentials your administrator gave you.',
    email: 'Email',
    emailPlaceholder: 'you@company.com',
    password: 'Password',
    passwordPlaceholder: 'Your password',
    submit: 'Sign in',
    forgot: 'I forgot my password',
    securityNote: 'Sessions close automatically after a period of inactivity.',
    tagline: 'Stock, purchases and sales in one place.',
    benefitOne: 'Real time stock across every warehouse',
    benefitTwo: 'Lot, serial and expiry tracking',
    benefitThree: 'Full audit trail of every movement',
    signingIn: 'Signing in',
    invalidCredentials: 'That email and password do not match an account.',
    emailRequired: 'Enter your email.',
    passwordRequired: 'Enter your password.',
    demoHintTitle: 'Prototype credentials',
    demoHintBody: 'Sign in with admin@gt.com and the password admin.',
  },

  organizations: {
    title: 'Companies',
    subtitle: 'Every company that operates on the platform.',
    create: 'New company',
    searchPlaceholder: 'Search by name or code',
    columnName: 'Company',
    columnCode: 'Code',
    columnCountry: 'Country',
    columnCurrency: 'Currency',
    columnUsers: 'Users',
    columnWarehouses: 'Warehouses',
    columnStatus: 'Status',
    resultCount: 'companies',
    columnCreatedAt: 'Created',
    columnCreatedBy: 'Created by',
    totalCompanies: 'Companies',
    totalUsers: 'Users',
    totalWarehouses: 'Warehouses',
    countryCount: 'Countries',
    columnActions: 'Actions',
    rowMenu: 'Open actions',
    viewDetails: 'View details',
    edit: 'Edit',
    delete: 'Delete',
    empty: 'No company matches this search.',
    none: 'No company has been created yet.',
    clearSearch: 'Clear search',
    toggleActive: 'Activate or deactivate',
    deleteTitle: 'Delete company?',
    deleteWarning:
      'Everything it holds goes with it: products, movements, users and documents. This cannot be undone.',
    deleteConfirm: 'Delete',
    deleteCancel: 'Cancel',
  },

  organizationForm: {
    title: 'New company',
    subtitle: 'The company is the boundary of all its data. Nothing crosses between them.',
    sectionIdentity: 'Identity',
    sectionLocation: 'Country and currency',
    sectionContact: 'Contact',
    name: 'Trade name',
    namePlaceholder: 'The name people use day to day',
    legalName: 'Legal name',
    legalNamePlaceholder: 'The name on tax documents',
    code: 'Code',
    codeHelp:
      'Assigned by the system from the trade name. It prefixes every document number and never changes.',
    codePending: 'It will be assigned when you create the company.',
    taxId: 'Tax number',
    country: 'Country',
    currency: 'Base currency',
    currencyHelp: 'Every cost is stored in this currency. It cannot be changed later.',
    email: 'Email',
    phone: 'Phone',
    address: 'Address',
    submit: 'Create company',
    cancel: 'Cancel',
    back: 'Back to companies',
    editTitle: 'Edit company',
    editSubtitle: 'Changes apply to everyone working in this company.',
    save: 'Save changes',
    phoneHelp: 'The prefix and the format follow the country you chose. For example',
    phoneIncomplete: 'This number is not complete for the country you chose.',
    notFound: 'That company no longer exists.',
    requiredField: 'This field is required.',
    duplicateTaxId: 'Another company in this country already uses this tax number.',
    duplicateTaxIdHelp:
      'Two companies of the same country cannot share it. Check the number, or open the company that already has it.',
  },

  users: {
    title: 'Users',
    subtitle: 'Who can sign in, and what they can reach.',
    create: 'New user',
    searchPlaceholder: 'Search by name or email',
    columnName: 'Name',
    columnEmail: 'Email',
    columnCountry: 'Country',
    columnCompanies: 'Companies',
    columnRoles: 'Roles',
    columnCreatedAt: 'Created',
    columnStatus: 'Status',
    columnActions: 'Actions',
    resultCount: 'users',
    empty: 'No user matches this search.',
    none: 'No user has been created yet.',
    staleVersion:
      'Someone else changed this account while you were editing. Reload to see their changes.',
    rowMenu: 'Open actions',
    edit: 'Edit',
    delete: 'Delete',
    toggleActive: 'Activate or deactivate',
    noCompanies: 'No access yet',
    deleteTitle: 'Delete user?',
    deleteWarning:
      'They lose access to every company at once. Their past movements stay in the audit log.',
    deleteConfirm: 'Delete',
    deleteCancel: 'Cancel',
    totalUsers: 'Users',
    totalActive: 'Active',
    totalCompaniesReached: 'Companies reached',
    totalAdmins: 'Company administrators',
  },

  userForm: {
    title: 'New user',
    subtitle: 'A person exists once, and reaches as many companies as you grant.',
    editTitle: 'Edit user',
    editSubtitle: 'Changes take effect the next time they sign in.',
    back: 'Back to users',
    sectionIdentity: 'Identity',
    photo: 'Photo',
    photoHelp: 'Square images look best. Up to 2 MB.',
    photoAdd: 'Upload photo',
    photoReplace: 'Replace',
    photoRemove: 'Remove',
    photoTooLarge: 'That image is over 2 MB. Pick a smaller one.',
    photoInvalidType: 'That file is not an image.',
    sectionPlatform: 'Platform access',
    platformHelp:
      'Reaches every company. Granted outside company access, because it is not a role.',
    platformToggle: 'Platform super administrator',
    platformWarning:
      'They will read and change data in every company, including ones they are not a member of. Every entry is recorded.',
    platformReason: 'Why they get it',
    platformReasonHelp: 'Read out loud at the periodic review of who holds this.',
    platformBadge: 'Super admin',
    sectionAccess: 'Company access',
    sectionPermissions: 'Resulting permissions',
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email',
    emailHelp: 'This is how they sign in. It cannot repeat across the platform.',
    country: 'Country',
    countryHelp: 'Sets their number and date format, not what they can reach.',
    accessHelp: 'Tick a company, then pick the role they hold in it.',
    accessEmpty: 'Grant at least one company, or they will sign in to nothing.',
    roleColumn: 'Role',
    permissionsHelp:
      'These come from the roles you chose above and cannot be edited one by one. Change the role to change them.',
    permissionsEmpty: 'Grant a company first, and its permissions will show here.',
    submit: 'Create user',
    save: 'Save changes',
    cancel: 'Cancel',
    notFound: 'That user no longer exists.',
    requiredField: 'This field is required.',
    invalidEmail: 'That does not look like an email address.',
    createdTitle: 'Account created',
    createdHelp:
      'Hand this password over in person, or through a channel they already trust. It is shown once and cannot be retrieved.',
    createdEmail: 'Signs in with',
    createdPassword: 'Temporary password',
    createdChange: 'They must choose their own password the first time they sign in.',
    createdCopy: 'Copy password',
    createdCopied: 'Copied',
    createdDone: 'Back to users',
  },

  /**
   * Nombres de los roles que toda empresa tiene. Se muestran por su código, así
   * que se leen en el idioma de quien mira y no en el de quien creó la empresa.
   */
  roles: {
    admin: 'Company administrator',
    purchasing: 'Purchasing',
    sales: 'Sales',
    warehouse: 'Warehouse',
    viewer: 'Read only',
  },

  audit: {
    title: 'Audit log',
    subtitle: 'What happened, who did it, and what changed.',
    searchPlaceholder: 'Search by entity, actor or action',
    filterAction: 'Action',
    filterActor: 'Actor',
    filterFrom: 'From',
    filterTo: 'To',
    filterAll: 'All',
    clearFilters: 'Clear filters',
    columnWhen: 'When',
    columnActor: 'Actor',
    columnAction: 'Action',
    columnEntity: 'Entity',
    columnCompany: 'Company',
    resultCount: 'entries',
    empty: 'No entry matches these filters.',
    elevated: 'Elevated privilege',
    elevatedShort: 'Elevated',
    platformScope: 'Platform',
    openDetail: 'Open detail',
    closeDetail: 'Close detail',
    detailTitle: 'Entry detail',
    detailWhen: 'When',
    detailActor: 'Actor',
    detailCompany: 'Company',
    detailEntity: 'Entity',
    detailAddress: 'Address',
    detailCorrelation: 'Correlation',
    detailChanges: 'What changed',
    detailField: 'Field',
    detailBefore: 'Before',
    detailAfter: 'After',
    detailNoChanges: 'This entry records a read. Nothing changed.',
    emptyValue: 'None',
    appendOnly:
      'Entries are written in the same transaction as the change and are never edited or deleted.',
    totalEntries: 'Entries',
    totalElevated: 'Elevated actions',
    totalActors: 'Actors',
    totalCompanies: 'Companies touched',
  },

  admin: {
    signedInAs: 'Signed in as',
    signOut: 'Sign out',
    platform: 'Platform',
    platformHint: 'All companies',
    enterCompany: 'Enter a company',
    backToAdministration: 'Back to administration',
  },
} as const;

/**
 * La forma de un catálogo: los mismos grupos y las mismas claves que el inglés,
 * con texto libre en las hojas. Se deriva del catálogo inglés en lugar de
 * escribirse a mano para que no puedan separarse.
 */
export type Copy = {
  readonly [Group in keyof typeof copyEn]: {
    readonly [Key in keyof (typeof copyEn)[Group]]: string;
  };
};

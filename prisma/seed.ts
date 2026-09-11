/**
 * Semillas: contenido mínimo sin el cual el sistema no arranca.
 *
 * Es idempotente. Se puede ejecutar tantas veces como haga falta sin duplicar
 * nada ni pisar datos que alguien haya editado después.
 *
 * Ejecutar con:  npm run db:seed
 *
 * La cuenta de super administrador se configura por variables de entorno, nunca
 * escrita en este archivo, porque quedaría en el repositorio para siempre.
 * Ver docs/standards/configuration-and-secrets.md
 */

import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

import { PERMISSIONS } from '../src/lib/auth/permissions.js';

const prisma = new PrismaClient();

/**
 * Parámetros de Argon2id. Se declaran aquí para la semilla y se repiten en el
 * módulo de autenticación. Valores recomendados por OWASP para uso interactivo.
 */
const ARGON2_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

const MINIMUM_PASSWORD_LENGTH = 12;

// ---------------------------------------------------------------------------
// Monedas
// ---------------------------------------------------------------------------

const CURRENCIES = [
  { code: 'GTQ', name: 'Quetzal guatemalteco', symbol: 'Q', decimalPlaces: 2 },
  // El dólar se carga junto a Guatemala porque buena parte de las compras de
  // importación se pactan en esa moneda. Sin él, el multimoneda no serviría
  // para el caso más común del país.
  { code: 'USD', name: 'Dólar estadounidense', symbol: '$', decimalPlaces: 2 },
] as const;

// ---------------------------------------------------------------------------
// Países
// ---------------------------------------------------------------------------

const COUNTRIES = [
  {
    code: 'GT',
    name: 'Guatemala',
    defaultCurrencyCode: 'GTQ',
    defaultTimeZone: 'America/Guatemala',
    taxIdLabel: 'NIT',
    // Provisional. El NIT guatemalteco lleva dígito verificador, que puede ser
    // un número o la letra K. Conviene que negocio confirme el formato exacto
    // antes de rechazar capturas de usuarios reales.
    taxIdPattern: '^[0-9]{2,12}-?[0-9Kk]$',
    phonePrefix: '+502',
  },
] as const;

// ---------------------------------------------------------------------------

async function seedCurrencies(): Promise<void> {
  for (const currency of CURRENCIES) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      // Solo se actualiza lo descriptivo. Nunca se reactiva una moneda que
      // alguien desactivó a propósito.
      update: {
        name: currency.name,
        symbol: currency.symbol,
        decimalPlaces: currency.decimalPlaces,
      },
      create: currency,
    });
  }
  console.log(`  Monedas: ${CURRENCIES.length}`);
}

async function seedCountries(): Promise<void> {
  for (const country of COUNTRIES) {
    await prisma.country.upsert({
      where: { code: country.code },
      update: {
        name: country.name,
        defaultCurrencyCode: country.defaultCurrencyCode,
        defaultTimeZone: country.defaultTimeZone,
        taxIdLabel: country.taxIdLabel,
        taxIdPattern: country.taxIdPattern,
        phonePrefix: country.phonePrefix,
      },
      create: country,
    });
  }
  console.log(`  Países: ${COUNTRIES.length}`);
}

async function seedPermissions(): Promise<void> {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: {
        resource: permission.resource,
        action: permission.action,
        scope: permission.scope,
        description: permission.description,
      },
      create: {
        code: permission.code,
        resource: permission.resource,
        action: permission.action,
        scope: permission.scope,
        description: permission.description,
      },
    });
  }

  // Un permiso retirado del catálogo debe desaparecer de la base, o quedaría
  // asignado a roles y concedería acceso que ya nadie declara en el código.
  const declared = PERMISSIONS.map((permission) => permission.code);
  const { count } = await prisma.permission.deleteMany({
    where: { code: { notIn: declared } },
  });

  console.log(`  Permisos: ${PERMISSIONS.length}${count > 0 ? `, ${count} retirados` : ''}`);
}

async function seedPlatformAdmin(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Faltan SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD. Decláralas en .env antes de sembrar.',
    );
  }

  if (password.length < MINIMUM_PASSWORD_LENGTH) {
    throw new Error(
      `SEED_ADMIN_PASSWORD debe tener al menos ${MINIMUM_PASSWORD_LENGTH} caracteres.`,
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  // Si la cuenta ya existe no se le toca la contraseña. Volver a sembrar no
  // debe revertir un cambio que la persona ya hizo.
  const user = existing
    ? existing
    : await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash: await hash(password, ARGON2_OPTIONS),
          fullName: 'Super administrador',
          status: 'ACTIVE',
          locale: 'en',
          // Nace obligada a cambiarla: la contraseña inicial estuvo en un
          // archivo de entorno y la conoce quien instaló el sistema.
          mustChangePassword: true,
          emailVerifiedAt: new Date(),
        },
        select: { id: true },
      });

  await prisma.platformAdmin.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      reason: 'Cuenta inicial creada por la semilla de instalación.',
      // Se concede a sí misma porque es la primera cuenta del sistema y no
      // existe nadie más que pueda otorgarlo. Las siguientes sí llevarán el
      // identificador de quien las concedió.
      grantedById: user.id,
    },
  });

  console.log(
    `  Super administrador: ${normalizedEmail}` +
      (existing ? ' (ya existía, sin cambios)' : ' (creado)'),
  );
}

async function main(): Promise<void> {
  console.log('Sembrando datos base...');

  // El orden importa: los países referencian monedas.
  await seedCurrencies();
  await seedCountries();
  await seedPermissions();
  await seedPlatformAdmin();

  console.log('Listo.');
}

main()
  .catch((error: unknown) => {
    console.error('La siembra falló:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });

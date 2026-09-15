'use server';

/**
 * Server Actions del dominio de empresas.
 *
 * Delgadas: autorizan, validan, delegan y traducen el resultado. El orden no es
 * casual. Primero el permiso, porque quien no puede crear una empresa tampoco
 * debe enterarse de si su identificador fiscal ya existe; después el esquema,
 * porque la lógica no debe ver un dato sin validar.
 *
 * El contexto de auditoría se construye después de autorizar y validar, con el
 * mismo permiso que se pidió. Viaja al repositorio, que escribe la entrada en la
 * misma transacción que el cambio.
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { type ZodError } from 'zod';

import { type PermissionCode } from '@/lib/auth/permissions';
import { ConflictError, NotFoundError, toErrorPayload, type ErrorPayload } from '@/lib/errors';
import { logger } from '@/lib/observability/logger';
import { isPhoneComplete } from '@/lib/phone';
import { buildAuditContext } from '@/modules/audit';
import { requirePlatformPermission } from '@/modules/auth/session';

import {
  createOrganization as insertOrganization,
  listCountryOptions,
  listTakenSlugs,
  setOrganizationActive as updateOrganizationActive,
  softDeleteOrganization as removeOrganization,
  updateOrganization as saveOrganization,
  type CountryOption,
} from './repository';
import { ORGANIZATIONS_PATH, organizationPath } from './routes';
import {
  createOrganizationSchema,
  organizationIdSchema,
  setOrganizationActiveSchema,
  updateOrganizationSchema,
} from './schema';
import { buildOrganizationSlug, matchesTaxIdPattern, normalizeTaxId } from './service';

export type OrganizationActionResult =
  { readonly ok: true } | { readonly ok: false; readonly error: ErrorPayload };

/**
 * El choque de identificador fiscal lo detecta la base, no una consulta previa.
 *
 * Preguntar antes y escribir después deja una rendija: entre las dos cosas cabe
 * otra alta. La restricción única de la base no tiene esa rendija, así que se
 * intenta escribir y se traduce su rechazo. Ver la migración
 * `datos_de_empresa_y_nombre_partido`.
 */
const UNIQUE_VIOLATION = 'P2002';

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { readonly code?: unknown }).code === UNIQUE_VIOLATION
  );
}

/** El primer problema de cada campo. Más de uno por campo no se puede leer. */
function toFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.join('.');
    if (field !== '' && fieldErrors[field] === undefined) fieldErrors[field] = issue.message;
  }
  return fieldErrors;
}

type CountryCheck =
  | {
      readonly ok: true;
      readonly country: CountryOption;
      /** Ya recortado, o nulo si no se dio. */
      readonly taxId: string | null;
    }
  | { readonly ok: false; readonly error: ErrorPayload };

/**
 * Lo que el país decide sobre los datos de una empresa.
 *
 * Es la misma comprobación al crear y al editar, y por eso vive una vez. El
 * formulario ya avisa de estas dos cosas; aquí se repiten porque la acción
 * también se puede invocar sin pasar por él.
 */
async function checkAgainstCountry(data: {
  readonly countryCode: string;
  readonly phone: string;
  readonly taxId: string;
}): Promise<CountryCheck> {
  const countries = await listCountryOptions();
  const country = countries.find((candidate) => candidate.code === data.countryCode);

  if (country === undefined) {
    return {
      ok: false,
      error: { code: 'VALIDATION_FAILED', fieldErrors: { countryCode: 'unknownCountry' } },
    };
  }

  // Un teléfono a medias no sirve para llamar. Llega con el prefijo del país
  // delante, que no cuenta para la plantilla.
  const national = data.phone.startsWith(country.phonePrefix)
    ? data.phone.slice(country.phonePrefix.length).trim()
    : data.phone;

  if (national !== '' && !isPhoneComplete(national, country.phoneMask)) {
    return {
      ok: false,
      error: { code: 'VALIDATION_FAILED', fieldErrors: { phone: 'incompletePhone' } },
    };
  }

  const normalized = normalizeTaxId(data.taxId);
  if (normalized !== '' && !matchesTaxIdPattern(data.taxId.trim(), country.taxIdPattern)) {
    return {
      ok: false,
      error: { code: 'VALIDATION_FAILED', fieldErrors: { taxId: 'invalidTaxId' } },
    };
  }

  return { ok: true, country, taxId: normalized === '' ? null : data.taxId.trim() };
}

/** Vacío y nulo no son lo mismo en la base: lo que no se dio, no está. */
function orNull(value: string): string | null {
  return value === '' ? null : value;
}

export async function createOrganization(input: unknown): Promise<OrganizationActionResult> {
  const permission: PermissionCode = 'platform.organization:create';

  try {
    const session = await requirePlatformPermission(permission);

    const parsed = createOrganizationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: { code: 'VALIDATION_FAILED', fieldErrors: toFieldErrors(parsed.error) },
      };
    }

    const checked = await checkAgainstCountry(parsed.data);
    if (!checked.ok) return { ok: false, error: checked.error };

    const slug = buildOrganizationSlug(parsed.data.name, await listTakenSlugs());

    await insertOrganization(
      {
        actorId: session.userId,
        slug,
        name: parsed.data.name,
        legalName: parsed.data.legalName,
        countryCode: checked.country.code,
        baseCurrencyCode: parsed.data.baseCurrencyCode,
        // La zona horaria sale del país. Es lo que decide el corte de los
        // informes diarios, y preguntarla sería pedir dos veces el mismo dato.
        timeZone: checked.country.defaultTimeZone,
        taxId: checked.taxId,
        email: orNull(parsed.data.email),
        phone: orNull(parsed.data.phone),
        address: orNull(parsed.data.address),
      },
      await buildAuditContext(session, permission),
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      logger.failure(
        'organizations.create',
        new ConflictError('Identificador fiscal repetido.'),
      );
      return {
        ok: false,
        error: { code: 'CONFLICT', fieldErrors: { taxId: 'duplicateTaxId' } },
      };
    }

    logger.failure('organizations.create', error);
    return { ok: false, error: toErrorPayload(error) };
  }

  // La lista está en caché de ruta: sin esto, la empresa recién creada no
  // aparecería hasta que algo más la invalidara.
  revalidatePath(ORGANIZATIONS_PATH);
  redirect(ORGANIZATIONS_PATH);
}

/**
 * Guarda los cambios de una empresa.
 *
 * El permiso es el de editar y no el de crear: son dos capacidades distintas, y
 * quien puede corregir un teléfono no tiene por qué poder dar de alta empresas.
 *
 * Si otra persona guardó mientras esta pantalla estaba abierta, no se escribe
 * nada y se responde que la versión quedó vieja. Sobrescribir en silencio haría
 * desaparecer el trabajo del otro sin que nadie se entere.
 */
export async function updateOrganization(input: unknown): Promise<OrganizationActionResult> {
  const permission: PermissionCode = 'platform.organization:update';
  let slug: string;

  try {
    const session = await requirePlatformPermission(permission);

    const parsed = updateOrganizationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: { code: 'VALIDATION_FAILED', fieldErrors: toFieldErrors(parsed.error) },
      };
    }

    const checked = await checkAgainstCountry(parsed.data);
    if (!checked.ok) return { ok: false, error: checked.error };

    const result = await saveOrganization(
      parsed.data.id,
      parsed.data.version,
      session.userId,
      {
        name: parsed.data.name,
        legalName: parsed.data.legalName,
        countryCode: checked.country.code,
        taxId: checked.taxId,
        email: orNull(parsed.data.email),
        phone: orNull(parsed.data.phone),
        address: orNull(parsed.data.address),
      },
      await buildAuditContext(session, permission),
    );

    if (result.outcome === 'NOT_FOUND') {
      throw new NotFoundError('La empresa no existe o ya fue eliminada.');
    }

    if (result.outcome === 'STALE_VERSION') {
      logger.failure(
        'organizations.update',
        new ConflictError('La empresa cambió mientras se editaba.'),
      );
      return { ok: false, error: { code: 'STALE_VERSION' } };
    }

    slug = result.slug;
  } catch (error) {
    if (isUniqueViolation(error)) {
      logger.failure(
        'organizations.update',
        new ConflictError('Identificador fiscal repetido.'),
      );
      return {
        ok: false,
        error: { code: 'CONFLICT', fieldErrors: { taxId: 'duplicateTaxId' } },
      };
    }

    logger.failure('organizations.update', error);
    return { ok: false, error: toErrorPayload(error) };
  }

  revalidatePath(ORGANIZATIONS_PATH);
  if (slug !== '') revalidatePath(organizationPath(slug));
  redirect(ORGANIZATIONS_PATH);
}

/**
 * Enciende o apaga una empresa.
 *
 * Apagarla no borra nada: quien pertenece a ella deja de poder entrar y sus
 * documentos siguen donde estaban. Por eso el permiso es el de suspender y no
 * el de editar.
 */
export async function setOrganizationActive(input: unknown): Promise<OrganizationActionResult> {
  const permission: PermissionCode = 'platform.organization:suspend';

  try {
    const session = await requirePlatformPermission(permission);

    const parsed = setOrganizationActiveSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: { code: 'VALIDATION_FAILED' } };
    }

    const changed = await updateOrganizationActive(
      parsed.data.id,
      parsed.data.isActive,
      session.userId,
      await buildAuditContext(session, permission),
    );
    if (!changed) {
      throw new NotFoundError('La empresa no existe o ya fue eliminada.');
    }
  } catch (error) {
    logger.failure('organizations.setActive', error);
    return { ok: false, error: toErrorPayload(error) };
  }

  // La fila vuelve del servidor con su estado nuevo. Sin esto, el interruptor
  // quedaría encendido en la pantalla y apagado en la base.
  revalidatePath(ORGANIZATIONS_PATH);
  return { ok: true };
}

/**
 * Elimina una empresa.
 *
 * Es la operación más destructiva de la plataforma, así que lleva permiso
 * propio: poder suspender una empresa no da derecho a borrarla. La fila no se
 * arranca, se marca como borrada; ver el repositorio.
 */
export async function deleteOrganization(input: unknown): Promise<OrganizationActionResult> {
  const permission: PermissionCode = 'platform.organization:delete';

  try {
    const session = await requirePlatformPermission(permission);

    const parsed = organizationIdSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: { code: 'VALIDATION_FAILED' } };
    }

    const deleted = await removeOrganization(
      parsed.data.id,
      session.userId,
      await buildAuditContext(session, permission),
    );
    if (!deleted) {
      throw new NotFoundError('La empresa no existe o ya fue eliminada.');
    }
  } catch (error) {
    logger.failure('organizations.delete', error);
    return { ok: false, error: toErrorPayload(error) };
  }

  revalidatePath(ORGANIZATIONS_PATH);
  return { ok: true };
}

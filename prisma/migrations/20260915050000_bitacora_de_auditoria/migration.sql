-- Bitacora de auditoria lista para escribirse.
--
-- La tabla existia desde la migracion inicial, pero nada escribia en ella y le
-- faltaba lo que las reglas piden:
--
--   1. RN-072 y el ADR 0005 exigen marcar lo hecho con privilegio de plataforma,
--      y el ADR 0005 pide ademas registrar que permiso se ejercia. No habia
--      columna para ninguna de las dos cosas.
--   2. Una entrada que solo guarda el identificador de la entidad no se puede
--      leer sin buscarla, y si la entidad cambia de codigo la entrada pasa a
--      mostrar el nombre de hoy. entity_label guarda el de entonces.
--   3. El autor se ponia a NULL si su cuenta se borraba de verdad, y la empresa
--      no tenia clave foranea: una entrada podia apuntar a una empresa que no
--      existe.
--   4. RN-071 dice que la bitacora no se edita ni se borra, y nada lo impedia.
--
-- La tabla esta vacia en todos los entornos, porque nada escribia en ella. Aun
-- asi la columna obligatoria nace con valor por omision y lo pierde en el acto,
-- para que la migracion no dependa de esa suposicion.

-- =============================================================================
-- 1. Columnas nuevas.
-- =============================================================================

ALTER TABLE "audit_logs"
  ADD COLUMN "acting_as_platform_admin" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "permission_code" TEXT,
  ADD COLUMN "entity_label" TEXT;

-- Sin valor por omision: quien escribe la entrada decide si hubo privilegio
-- elevado. Un false implicito es justo el error que RN-072 quiere evitar.
ALTER TABLE "audit_logs" ALTER COLUMN "acting_as_platform_admin" DROP DEFAULT;

-- =============================================================================
-- 2. Claves foraneas con RESTRICT.
--
-- Cuentas y empresas se borran de forma logica, asi que RESTRICT no le estorba
-- a nadie. Lo que impide es que un borrado real deje entradas sin autor o
-- apuntando a una empresa inexistente. El indice de organization_id ya existe:
-- es la primera columna de audit_logs_organization_id_created_at_idx.
-- =============================================================================

ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actor_id_fkey";
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================================================
-- 3. Forma de la accion: dominio.hecho, en minusculas.
--
-- El catalogo real vive en el codigo. Esto solo impide que entre una accion
-- escrita a mano con otra forma, que despues no apareceria en ningun filtro.
-- =============================================================================

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_action_format" CHECK ("action" ~ '^[a-z_]+\.[a-z_]+$');

-- =============================================================================
-- 4. Solo insercion. RN-071.
--
-- No es logica de negocio en un disparador, que las reglas de base de datos
-- prohiben: es una invariante que la base defiende, como un CHECK que Postgres
-- no sabe expresar de otra forma.
--
-- Se hace con disparador y no retirando permisos porque, por ahora, la
-- aplicacion y las migraciones usan el mismo rol en Neon, y a ese rol no se le
-- puede quitar lo que necesita para migrar. El dueno de la tabla puede
-- desactivar el disparador; la proteccion completa llega con un rol propio para
-- la aplicacion, sin permisos sobre esta tabla mas alla de SELECT e INSERT.
--
-- TRUNCATE va aparte porque no dispara triggers de fila.
-- =============================================================================

CREATE FUNCTION "audit_logs_reject_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'La bitacora de auditoria es de solo insercion: % rechazado.', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE TRIGGER "audit_logs_reject_update_delete"
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION "audit_logs_reject_change"();

CREATE TRIGGER "audit_logs_reject_truncate"
  BEFORE TRUNCATE ON "audit_logs"
  FOR EACH STATEMENT EXECUTE FUNCTION "audit_logs_reject_change"();

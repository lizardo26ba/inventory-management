-- La persona en el contexto de la base: ver lo propio antes de elegir empresa.
--
-- Hasta aqui la base solo sabia en que empresa se actua. Pero hay dos momentos en
-- que todavia no hay empresa y hace falta leer datos de empresa de una persona:
--
-- 1. Al entrar, para ofrecerle las empresas a las que pertenece y su rol en cada
--    una. RN-001.
-- 2. En cada peticion con empresa activa, para comprobar que su membresia sigue
--    viva. Retirar el acceso tiene que cortar la sesion en el acto. RN-006.
--
-- Sin empresa declarada, las politicas del ADR 0010 devuelven cero filas, que es
-- lo correcto para todo lo demas. Aqui se anade, solo para leer, lo que es de la
-- propia persona. Ver el ADR 0013.
--
-- Todas las politicas nuevas son FOR SELECT. Una politica permisiva se suma a las
-- existentes con un O, asi que estas amplian la lectura y nada mas: escribir sigue
-- exigiendo la empresa en el contexto, porque para INSERT, UPDATE y DELETE solo
-- cuentan las politicas del ADR 0010.
--
-- Solo cuentan las membresias activas y no revocadas. Una revocada deja de dar
-- acceso, y tambien deja de ensenar el nombre de la empresa.
--
-- Es aditiva y se deshace con una migracion nueva que ejecute, en este orden:
--   DROP POLICY "roles_of_own_memberships" ON "roles";
--   DROP POLICY "membership_roles_of_own_memberships" ON "membership_roles";
--   DROP POLICY "organizations_of_own_memberships" ON "organizations";
--   DROP POLICY "memberships_own_rows" ON "memberships";
--   DROP FUNCTION "app_user_id"();

-- =============================================================================
-- 1. De donde sale la persona. Igual que las otras dos lecturas del contexto:
-- sin valor puesto, nulo, y con nulo ninguna comparacion es cierta.
-- =============================================================================

CREATE FUNCTION "app_user_id"() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.user_id', true), '')
$$;

-- =============================================================================
-- 2. Sus membresias.
-- =============================================================================

CREATE POLICY "memberships_own_rows" ON "memberships"
  FOR SELECT
  USING (
    "user_id" = app_user_id()
    AND "is_active"
    AND "revoked_at" IS NULL
  );

-- =============================================================================
-- 3. Las empresas a las que pertenece. La subconsulta pasa por la politica de
-- memberships de arriba, asi que solo encuentra las suyas.
-- =============================================================================

CREATE POLICY "organizations_of_own_memberships" ON "organizations"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "memberships" m
      WHERE m."organization_id" = "organizations"."id"
        AND m."user_id" = app_user_id()
        AND m."is_active"
        AND m."revoked_at" IS NULL
    )
  );

-- =============================================================================
-- 4. Sus roles en cada una, para decirle con que rol va a entrar.
-- =============================================================================

CREATE POLICY "membership_roles_of_own_memberships" ON "membership_roles"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "memberships" m
      WHERE m."id" = "membership_roles"."membership_id"
        AND m."user_id" = app_user_id()
        AND m."is_active"
        AND m."revoked_at" IS NULL
    )
  );

CREATE POLICY "roles_of_own_memberships" ON "roles"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM "membership_roles" mr
      JOIN "memberships" m ON m."id" = mr."membership_id"
      WHERE mr."role_id" = "roles"."id"
        AND m."user_id" = app_user_id()
        AND m."is_active"
        AND m."revoked_at" IS NULL
    )
  );

-- Seguridad a nivel de fila: la segunda barrera del aislamiento entre empresas.
--
-- El ADR 0003 la decidio y nunca se implemento, asi que hasta hoy el aislamiento
-- dependia de que cada consulta recordara filtrar. A partir de aqui, un olvido de
-- filtro deja de ser una fuga: la base devuelve cero filas.
--
-- Como sabe la base en que empresa se actua: la aplicacion lo declara al abrir
-- cada transaccion, con set_config local. Ver src/lib/db/scope.ts y el ADR 0010.
--
-- FORCE, y no solo ENABLE: sin FORCE el dueno de la tabla queda exento y las
-- politicas no le aplican. Aun asi, un rol con BYPASSRLS se las salta igualmente,
-- y por eso la aplicacion pasa a conectarse con un rol propio que no lo tiene.
-- Ver scripts/db/app-role.sql

-- =============================================================================
-- 1. De donde sale el contexto.
--
-- Son dos lecturas de la configuracion de la sesion, no logica de negocio: las
-- reglas prohiben meter reglas en la base, y esto no lo es. Existen para que las
-- politicas se lean y para no repetir el mismo current_setting treinta veces.
--
-- El segundo argumento de current_setting en true significa "devuelve nulo si no
-- esta puesta", en lugar de fallar. Sin contexto no hay empresa, y sin empresa no
-- se ve nada, que es como tiene que fallar.
-- =============================================================================

CREATE FUNCTION "app_organization_id"() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.organization_id', true), '')
$$;

CREATE FUNCTION "app_is_platform"() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('app.platform_admin', true), '') = 'on'
$$;

-- =============================================================================
-- 2. Las tablas de negocio, que llevan organization_id.
--
-- Todas reciben la misma politica, asi que se recorren en lugar de repetirla
-- veinticinco veces. La lista es explicita: una tabla nueva no queda protegida
-- sola, entra por su propia migracion y quien la escribe tiene que decidirlo.
--
-- audit_logs queda fuera de este grupo: su empresa puede ser nula, y eso pide una
-- politica propia mas abajo.
-- =============================================================================

DO $$
DECLARE
  tabla text;
  tablas text[] := ARRAY[
    'memberships', 'roles', 'warehouses', 'units_of_measure', 'categories',
    'products', 'suppliers', 'customers', 'lots', 'serial_numbers',
    'stock_movements', 'stock_levels', 'purchase_orders', 'purchase_order_lines',
    'purchase_receipts', 'purchase_receipt_lines', 'sales_orders',
    'sales_order_lines', 'sales_shipments', 'sales_shipment_lines',
    'document_sequences', 'idempotency_keys', 'outbox_events'
  ];
BEGIN
  FOREACH tabla IN ARRAY tablas LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tabla);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tabla);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (app_is_platform() OR organization_id = app_organization_id()) WITH CHECK (app_is_platform() OR organization_id = app_organization_id())',
      tabla || '_organization_isolation',
      tabla
    );
  END LOOP;
END
$$;

-- =============================================================================
-- 3. La empresa misma. Su identificador es la organizacion, no una columna
-- aparte.
-- =============================================================================

ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" FORCE ROW LEVEL SECURITY;

CREATE POLICY "organizations_organization_isolation" ON "organizations"
  USING (app_is_platform() OR "id" = app_organization_id())
  WITH CHECK (app_is_platform() OR "id" = app_organization_id());

-- =============================================================================
-- 4. La bitacora. Su empresa es nula en lo que es de plataforma, como una cuenta
-- de usuario, y tambien cuando nadie habia iniciado sesion.
--
-- Leer: solo la plataforma ve las entradas sin empresa. Una empresa ve las suyas.
-- Escribir: se acepta una entrada cuya empresa coincide con el contexto, y eso
-- incluye escribir sin empresa cuando tampoco hay contexto, que es lo que ocurre
-- al entrar o al bloquearse una cuenta por intentos fallidos.
-- =============================================================================

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_organization_isolation" ON "audit_logs"
  USING (app_is_platform() OR "organization_id" = app_organization_id())
  WITH CHECK (
    app_is_platform() OR "organization_id" IS NOT DISTINCT FROM app_organization_id()
  );

-- =============================================================================
-- 5. Las tablas puente, que no llevan organization_id.
--
-- Su empresa es la de su fila padre, asi que la politica la mira alli. Cuesta una
-- comprobacion mas y evita migrar datos sobre tablas que ya tienen filas. Ver el
-- ADR 0010, donde se descarto anadirles la columna.
-- =============================================================================

ALTER TABLE "role_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "role_permissions" FORCE ROW LEVEL SECURITY;

CREATE POLICY "role_permissions_organization_isolation" ON "role_permissions"
  USING (
    app_is_platform() OR EXISTS (
      SELECT 1 FROM "roles" r
      WHERE r."id" = "role_permissions"."role_id"
        AND r."organization_id" = app_organization_id()
    )
  )
  WITH CHECK (
    app_is_platform() OR EXISTS (
      SELECT 1 FROM "roles" r
      WHERE r."id" = "role_permissions"."role_id"
        AND r."organization_id" = app_organization_id()
    )
  );

ALTER TABLE "membership_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "membership_roles" FORCE ROW LEVEL SECURITY;

CREATE POLICY "membership_roles_organization_isolation" ON "membership_roles"
  USING (
    app_is_platform() OR EXISTS (
      SELECT 1 FROM "memberships" m
      WHERE m."id" = "membership_roles"."membership_id"
        AND m."organization_id" = app_organization_id()
    )
  )
  WITH CHECK (
    app_is_platform() OR EXISTS (
      SELECT 1 FROM "memberships" m
      WHERE m."id" = "membership_roles"."membership_id"
        AND m."organization_id" = app_organization_id()
    )
  );

ALTER TABLE "warehouse_access" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "warehouse_access" FORCE ROW LEVEL SECURITY;

CREATE POLICY "warehouse_access_organization_isolation" ON "warehouse_access"
  USING (
    app_is_platform() OR EXISTS (
      SELECT 1 FROM "memberships" m
      WHERE m."id" = "warehouse_access"."membership_id"
        AND m."organization_id" = app_organization_id()
    )
  )
  WITH CHECK (
    app_is_platform() OR EXISTS (
      SELECT 1 FROM "memberships" m
      WHERE m."id" = "warehouse_access"."membership_id"
        AND m."organization_id" = app_organization_id()
    )
  );

ALTER TABLE "stock_movement_serials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "stock_movement_serials" FORCE ROW LEVEL SECURITY;

CREATE POLICY "stock_movement_serials_organization_isolation" ON "stock_movement_serials"
  USING (
    app_is_platform() OR EXISTS (
      SELECT 1 FROM "stock_movements" s
      WHERE s."id" = "stock_movement_serials"."movement_id"
        AND s."organization_id" = app_organization_id()
    )
  )
  WITH CHECK (
    app_is_platform() OR EXISTS (
      SELECT 1 FROM "stock_movements" s
      WHERE s."id" = "stock_movement_serials"."movement_id"
        AND s."organization_id" = app_organization_id()
    )
  );

-- =============================================================================
-- 6. Lo que queda fuera, y por que.
--
-- users, sessions, password_reset_tokens y platform_admins son identidad: una
-- persona existe por encima de las empresas, y su acceso lo decide el permiso.
--
-- countries, currencies, exchange_rates y permissions son catalogos del producto,
-- iguales para todos los clientes.
--
-- _prisma_migrations es de la herramienta.
-- =============================================================================

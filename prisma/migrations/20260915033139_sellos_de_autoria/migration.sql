-- Sellos de autoria en toda entidad que una persona pueda tocar.
--
-- Cierra tres huecos que venian de la migracion inicial:
--
--   1. organizations, users, memberships, units_of_measure y categories no
--      tenian ningun sello. Nadie registraba quien creo una empresa, aunque
--      RN-003 dice que solo el super administrador las crea, ni quien concedio
--      un acceso, aunque RN-002 dice que lo concede un administrador.
--   2. warehouses, products, suppliers y customers tenian los sellos anulables,
--      asi que se podian escribir vacios. La seccion 1 de
--      .claude/agents/database-architect.md los pide en toda tabla que un
--      usuario modifique, y una columna opcional no es una regla.
--   3. La cabecera del esquema dice que la clave foranea real de estos sellos
--      se crea en una migracion SQL. Esa migracion nunca se escribio: no habia
--      ni una sola clave foranea ni un solo indice sobre estas columnas.
--
-- Que significa updated_by_id: quien toco la fila por ultima vez, incluida la
-- creacion. Por eso al insertar vale lo mismo que created_by_id, y por eso
-- puede ser NOT NULL sin mentir.
--
-- Lo inmutable no lleva sello de modificacion. Movimientos, lotes, recepciones
-- y despachos solo tienen created_by_id, porque el ADR 0002 y la RN-033 dicen
-- que no se editan: un campo de ultimo modificador ahi seria un campo que nunca
-- se llena, o una invitacion a editarlos.
--
-- Forma: expandir, rellenar y contraer. Las columnas nuevas nacen anulables,
-- como pide la seccion 7, y solo se endurecen cuando ya no queda ningun nulo.

-- =============================================================================
-- 1. Expandir. Columnas nuevas, anulables todavia.
-- =============================================================================

ALTER TABLE "organizations"
  ADD COLUMN "created_by_id" TEXT,
  ADD COLUMN "updated_by_id" TEXT;

ALTER TABLE "users"
  ADD COLUMN "created_by_id" TEXT,
  ADD COLUMN "updated_by_id" TEXT;

ALTER TABLE "memberships"
  ADD COLUMN "created_by_id" TEXT,
  ADD COLUMN "updated_by_id" TEXT;

ALTER TABLE "units_of_measure"
  ADD COLUMN "created_by_id" TEXT,
  ADD COLUMN "updated_by_id" TEXT;

ALTER TABLE "categories"
  ADD COLUMN "created_by_id" TEXT,
  ADD COLUMN "updated_by_id" TEXT;

-- =============================================================================
-- 2. Rellenar.
--
-- Estas filas son anteriores al sello, asi que su autor real no esta escrito en
-- ninguna parte y no se puede deducir. Se atribuyen a la cuenta fundadora, que
-- es la unica que pudo crearlas: la primera del sistema, la que la semilla se
-- concede a si misma porque no existe nadie mas que pueda otorgarle el acceso
-- de plataforma. Es una atribucion declarada, no un dato recuperado.
-- =============================================================================

DO $$
DECLARE
  fundador TEXT;
  cuentas BIGINT;
BEGIN
  -- La cuenta que se concedio el acceso a si misma. Si hubiera varias, la mas
  -- antigua. Si no hubiera ninguna, la primera cuenta creada.
  SELECT COALESCE(
    (SELECT user_id FROM "platform_admins" WHERE user_id = granted_by_id ORDER BY granted_at ASC LIMIT 1),
    (SELECT id FROM "users" ORDER BY created_at ASC LIMIT 1)
  ) INTO fundador;

  SELECT COUNT(*) INTO cuentas FROM "users";

  IF fundador IS NULL AND cuentas > 0 THEN
    RAISE EXCEPTION 'Hay % cuentas y ninguna fundadora a la que atribuirlas. Revisar platform_admins antes de migrar.', cuentas;
  END IF;

  IF fundador IS NOT NULL THEN
    UPDATE "users"            SET created_by_id = fundador, updated_by_id = fundador WHERE created_by_id IS NULL;
    UPDATE "organizations"    SET created_by_id = fundador, updated_by_id = fundador WHERE created_by_id IS NULL;
    UPDATE "memberships"      SET created_by_id = fundador, updated_by_id = fundador WHERE created_by_id IS NULL;
    UPDATE "units_of_measure" SET created_by_id = fundador, updated_by_id = fundador WHERE created_by_id IS NULL;
    UPDATE "categories"       SET created_by_id = fundador, updated_by_id = fundador WHERE created_by_id IS NULL;

    -- Las que ya tenian la columna, por si algun entorno dejo nulos.
    UPDATE "warehouses" SET created_by_id = fundador WHERE created_by_id IS NULL;
    UPDATE "products"   SET created_by_id = fundador WHERE created_by_id IS NULL;
    UPDATE "suppliers"  SET created_by_id = fundador WHERE created_by_id IS NULL;
    UPDATE "customers"  SET created_by_id = fundador WHERE created_by_id IS NULL;
  END IF;

  -- Una fila que nunca se modifico tiene por ultimo autor a quien la creo. Se
  -- toma de su propia fila y no del fundador: ese dato si existe.
  UPDATE "warehouses"      SET updated_by_id = created_by_id WHERE updated_by_id IS NULL;
  UPDATE "products"        SET updated_by_id = created_by_id WHERE updated_by_id IS NULL;
  UPDATE "suppliers"       SET updated_by_id = created_by_id WHERE updated_by_id IS NULL;
  UPDATE "customers"       SET updated_by_id = created_by_id WHERE updated_by_id IS NULL;
  UPDATE "purchase_orders" SET updated_by_id = created_by_id WHERE updated_by_id IS NULL;
  UPDATE "sales_orders"    SET updated_by_id = created_by_id WHERE updated_by_id IS NULL;
END $$;

-- =============================================================================
-- 3. Contraer. Ya no queda ningun nulo, asi que la regla se puede exigir.
-- =============================================================================

ALTER TABLE "organizations"
  ALTER COLUMN "created_by_id" SET NOT NULL,
  ALTER COLUMN "updated_by_id" SET NOT NULL;

ALTER TABLE "users"
  ALTER COLUMN "created_by_id" SET NOT NULL,
  ALTER COLUMN "updated_by_id" SET NOT NULL;

ALTER TABLE "memberships"
  ALTER COLUMN "created_by_id" SET NOT NULL,
  ALTER COLUMN "updated_by_id" SET NOT NULL;

ALTER TABLE "units_of_measure"
  ALTER COLUMN "created_by_id" SET NOT NULL,
  ALTER COLUMN "updated_by_id" SET NOT NULL;

ALTER TABLE "categories"
  ALTER COLUMN "created_by_id" SET NOT NULL,
  ALTER COLUMN "updated_by_id" SET NOT NULL;

ALTER TABLE "warehouses"
  ALTER COLUMN "created_by_id" SET NOT NULL,
  ALTER COLUMN "updated_by_id" SET NOT NULL;

ALTER TABLE "products"
  ALTER COLUMN "created_by_id" SET NOT NULL,
  ALTER COLUMN "updated_by_id" SET NOT NULL;

ALTER TABLE "suppliers"
  ALTER COLUMN "created_by_id" SET NOT NULL,
  ALTER COLUMN "updated_by_id" SET NOT NULL;

ALTER TABLE "customers"
  ALTER COLUMN "created_by_id" SET NOT NULL,
  ALTER COLUMN "updated_by_id" SET NOT NULL;

ALTER TABLE "purchase_orders"
  ALTER COLUMN "updated_by_id" SET NOT NULL;

ALTER TABLE "sales_orders"
  ALTER COLUMN "updated_by_id" SET NOT NULL;

-- =============================================================================
-- 4. La clave foranea que la cabecera del esquema prometia, con su indice.
--
-- RESTRICT y no CASCADE ni SET NULL: un autor no se borra de verdad nunca, se
-- marca con deleted_at, asi que la restriccion no le estorba a nadie. Lo que
-- impide es que un borrado real por error se lleve por delante la autoria de
-- filas que siguen vivas, o la deje apuntando al vacio.
--
-- El indice no es opcional: Postgres no lo crea solo con la clave foranea, y
-- sin el, comprobar la restriccion al borrar una cuenta recorre la tabla
-- entera. Seccion 6 de las reglas de base de datos.
-- =============================================================================

ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "organizations_created_by_id_idx" ON "organizations"("created_by_id");
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "organizations_updated_by_id_idx" ON "organizations"("updated_by_id");

ALTER TABLE "users" ADD CONSTRAINT "users_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "users_created_by_id_idx" ON "users"("created_by_id");
ALTER TABLE "users" ADD CONSTRAINT "users_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "users_updated_by_id_idx" ON "users"("updated_by_id");

ALTER TABLE "memberships" ADD CONSTRAINT "memberships_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "memberships_created_by_id_idx" ON "memberships"("created_by_id");
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "memberships_updated_by_id_idx" ON "memberships"("updated_by_id");

ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "warehouses_created_by_id_idx" ON "warehouses"("created_by_id");
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "warehouses_updated_by_id_idx" ON "warehouses"("updated_by_id");

ALTER TABLE "units_of_measure" ADD CONSTRAINT "units_of_measure_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "units_of_measure_created_by_id_idx" ON "units_of_measure"("created_by_id");
ALTER TABLE "units_of_measure" ADD CONSTRAINT "units_of_measure_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "units_of_measure_updated_by_id_idx" ON "units_of_measure"("updated_by_id");

ALTER TABLE "categories" ADD CONSTRAINT "categories_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "categories_created_by_id_idx" ON "categories"("created_by_id");
ALTER TABLE "categories" ADD CONSTRAINT "categories_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "categories_updated_by_id_idx" ON "categories"("updated_by_id");

ALTER TABLE "products" ADD CONSTRAINT "products_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "products_created_by_id_idx" ON "products"("created_by_id");
ALTER TABLE "products" ADD CONSTRAINT "products_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "products_updated_by_id_idx" ON "products"("updated_by_id");

ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "suppliers_created_by_id_idx" ON "suppliers"("created_by_id");
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "suppliers_updated_by_id_idx" ON "suppliers"("updated_by_id");

ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "customers_created_by_id_idx" ON "customers"("created_by_id");
ALTER TABLE "customers" ADD CONSTRAINT "customers_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "customers_updated_by_id_idx" ON "customers"("updated_by_id");

ALTER TABLE "lots" ADD CONSTRAINT "lots_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "lots_created_by_id_idx" ON "lots"("created_by_id");

ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "stock_movements_created_by_id_idx" ON "stock_movements"("created_by_id");

ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "purchase_orders_created_by_id_idx" ON "purchase_orders"("created_by_id");
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "purchase_orders_updated_by_id_idx" ON "purchase_orders"("updated_by_id");

ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "purchase_receipts_created_by_id_idx" ON "purchase_receipts"("created_by_id");

ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "sales_orders_created_by_id_idx" ON "sales_orders"("created_by_id");
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "sales_orders_updated_by_id_idx" ON "sales_orders"("updated_by_id");

ALTER TABLE "sales_shipments" ADD CONSTRAINT "sales_shipments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "sales_shipments_created_by_id_idx" ON "sales_shipments"("created_by_id");


-- Indices que sostienen la pantalla de la bitacora.
--
-- La lista pagina por cursor sobre (created_at, id) y filtra por valores exactos.
-- Cada indice empieza por la columna del filtro y termina en el instante, que es
-- el orden de la lista: asi la base recorre el indice y se detiene, en lugar de
-- traer filas y ordenarlas despues.
--
-- El de (created_at, id) no empieza por organization_id, a diferencia del resto
-- del esquema. La vista de plataforma lista por encima de todas las empresas y
-- solo la alcanza el super administrador con su permiso. ADR 0003, ADR 0005.
--
-- audit_logs_actor_id_idx se sustituye por (actor_id, created_at), que sirve para
-- lo mismo y ademas ordena. La clave foranea de actor_id sigue teniendo indice:
-- es el prefijo del nuevo.
--
-- Sin CONCURRENTLY: la tabla esta practicamente vacia en todos los entornos,
-- porque la bitacora empezo a escribirse hace un dia. Cuando crezca, un indice
-- nuevo sobre ella si tendra que crearse de forma concurrente y fuera de
-- migracion.
--
-- Esta migracion se genero con --create-only y se limpio a mano: Prisma proponia
-- borrar las claves foraneas y los indices de created_by_id y updated_by_id, que
-- no conoce porque viven solo en SQL. Ver database-architect.md, seccion 7.1.

-- DropIndex
DROP INDEX "audit_logs_actor_id_idx";

-- CreateIndex
CREATE INDEX "audit_logs_created_at_id_idx" ON "audit_logs"("created_at", "id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_correlation_id_idx" ON "audit_logs"("correlation_id");

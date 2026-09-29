-- Formato del codigo de almacen. RN-090.
--
-- El codigo lo escribe una persona y se lee en etiquetas y documentos: de 2 a 10
-- letras mayusculas, digitos o guiones. La aplicacion ya lo valida en la
-- frontera; la base lo defiende tambien, porque un codigo en minusculas o con
-- espacios escrito por otro camino dejaria de chocar con su gemelo en la clave
-- unica (organization_id, code), que ya existe desde la migracion inicial.
--
-- Lo que la base no defiende, y por que:
--
-- - RN-091, que el codigo no cambie: no es una restriccion sobre la fila sino
--   sobre su historia, y expresarlo exigiria un disparador. Las reglas prohiben
--   logica de negocio en disparadores. Lo defiende la aplicacion, que no ofrece
--   ningun camino para cambiarlo.
-- - RN-092, que un almacen con existencias no se archive: cruza dos tablas. Lo
--   defiende el repositorio, bloqueando la fila del almacen en la misma
--   transaccion que lee sus saldos.
--
-- Hasta hoy ninguna pantalla creaba almacenes, asi que no se esperan filas que
-- incumplan el formato. Si las hubiera, la migracion falla y no aplica nada: hay
-- que corregir esas filas antes de volver a desplegar.
--
-- Es aditiva y se deshace con una migracion nueva que ejecute:
--   ALTER TABLE "warehouses" DROP CONSTRAINT "warehouses_code_format";

ALTER TABLE "warehouses"
  ADD CONSTRAINT "warehouses_code_format" CHECK ("code" ~ '^[A-Z0-9-]{2,10}$');

-- Identificador estable para los roles que crea el sistema.
--
-- Un rol del sistema existe en cada empresa con el mismo significado, y su
-- nombre se tiene que poder mostrar en el idioma de quien mira. Con solo el
-- nombre guardado, la interfaz ensenaria siempre el idioma en que se creo la
-- empresa, y renombrarlo la dejaria sin forma de reconocerlo.
--
-- Admite nulo porque los roles que crea una empresa no son del sistema: su
-- nombre es el que su autor escribio y no hay nada que traducir.
--
-- El unico por empresa y codigo impide dos veces el mismo rol del sistema en la
-- misma empresa. En Postgres los nulos no chocan entre si, asi que los roles
-- propios de la empresa no estorban.
--
-- Para revertirla:
--   DROP INDEX "roles_organization_id_code_key";
--   ALTER TABLE "roles" DROP COLUMN "code";

ALTER TABLE "roles" ADD COLUMN "code" TEXT;

CREATE UNIQUE INDEX "roles_organization_id_code_key" ON "roles"("organization_id", "code");

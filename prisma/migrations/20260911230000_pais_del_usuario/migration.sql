-- El pais de la persona, aparte del pais de la empresa.
--
-- Una misma persona puede trabajar para empresas de varios paises, asi que su
-- pais no se deduce de ninguna de ellas. Sirve para presentar sus datos y para
-- saber como se escribe su telefono.
--
-- Admite nulo a proposito. Las cuentas que existian antes de esta columna no
-- tienen pais, y ponerles uno por omision seria inventar un dato de una persona
-- real. El formulario si lo exige para las cuentas nuevas.
--
-- La referencia al catalogo de paises impide guardar un codigo que no existe, y
-- RESTRICT impide borrar un pais que alguien este usando.
--
-- Para revertirla:
--   ALTER TABLE "users" DROP CONSTRAINT "users_country_code_fkey";
--   DROP INDEX "users_country_code_idx";
--   ALTER TABLE "users" DROP COLUMN "country_code";

ALTER TABLE "users" ADD COLUMN "country_code" CHAR(2);

CREATE INDEX "users_country_code_idx" ON "users"("country_code");

ALTER TABLE "users"
  ADD CONSTRAINT "users_country_code_fkey"
  FOREIGN KEY ("country_code") REFERENCES "countries"("code")
  ON DELETE RESTRICT ON UPDATE CASCADE;

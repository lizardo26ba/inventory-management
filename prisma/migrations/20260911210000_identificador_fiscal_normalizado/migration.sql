-- El identificador fiscal se compara normalizado, no tal como se escribio.
--
-- El indice anterior comparaba el texto literal, asi que "2400237-1" y
-- "24002371" convivian como si fueran dos contribuyentes distintos. Son el
-- mismo: el guion es presentacion, no identidad. Aqui el indice pasa a comparar
-- el valor sin separadores y en mayusculas, que es la misma normalizacion que
-- aplica el codigo antes de escribir.
--
-- Sigue siendo parcial. Las organizaciones sin identificador no deben chocar
-- entre ellas, y una organizacion borrada no debe impedir que su identificador
-- se vuelva a usar.
--
-- Para revertirla:
--   DROP INDEX "organizations_country_code_tax_id_key";
--   CREATE UNIQUE INDEX "organizations_country_code_tax_id_key"
--     ON "organizations" ("country_code", "tax_id")
--     WHERE "tax_id" IS NOT NULL AND "deleted_at" IS NULL;

DROP INDEX "organizations_country_code_tax_id_key";

CREATE UNIQUE INDEX "organizations_country_code_tax_id_key"
  ON "organizations" ("country_code", upper(regexp_replace("tax_id", '[^0-9A-Za-z]', '', 'g')))
  WHERE "tax_id" IS NOT NULL AND "deleted_at" IS NULL;

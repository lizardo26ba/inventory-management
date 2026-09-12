-- Datos de contacto de la empresa, unicidad del identificador fiscal por pais,
-- y nombre de persona partido en dos columnas.
--
-- Escrita a mano y no generada, por dos motivos: el nombre partido necesita
-- rellenar las filas que ya existen antes de poder exigir NOT NULL, y el indice
-- del identificador fiscal es parcial, que es algo que el esquema de Prisma no
-- sabe expresar.
--
-- Para revertirla, en este orden:
--   ALTER TABLE "users" ADD COLUMN "full_name" TEXT;
--   UPDATE "users" SET "full_name" = trim("first_name" || ' ' || "last_name");
--   ALTER TABLE "users" ALTER COLUMN "full_name" SET NOT NULL;
--   ALTER TABLE "users" DROP COLUMN "first_name", DROP COLUMN "last_name";
--   DROP INDEX "organizations_country_code_tax_id_key";
--   ALTER TABLE "organizations"
--     DROP COLUMN "legal_name", DROP COLUMN "email",
--     DROP COLUMN "phone", DROP COLUMN "address";

-- ---------------------------------------------------------------------------
-- 1. Razon social y contacto de la organizacion
-- ---------------------------------------------------------------------------
-- La razon social nace admitiendo nulos, se rellena y despues se exige. Ese
-- rodeo es lo que permite aplicarla sobre una base con datos.

ALTER TABLE "organizations" ADD COLUMN "legal_name" TEXT;
UPDATE "organizations" SET "legal_name" = "name" WHERE "legal_name" IS NULL;
ALTER TABLE "organizations" ALTER COLUMN "legal_name" SET NOT NULL;

ALTER TABLE "organizations" ADD COLUMN "email" TEXT;
ALTER TABLE "organizations" ADD COLUMN "phone" TEXT;
ALTER TABLE "organizations" ADD COLUMN "address" TEXT;

-- ---------------------------------------------------------------------------
-- 2. Un identificador fiscal no se repite dentro del mismo pais
-- ---------------------------------------------------------------------------
-- Es una identidad ante una administracion tributaria: repetirla significa que
-- una de las dos organizaciones esta mal registrada, y a partir de ahi las
-- facturas de una se pueden atribuir a la otra. Entre paises no choca, porque
-- cada administracion numera por su cuenta.
--
-- El indice es parcial por dos razones. Las organizaciones que todavia no tienen
-- identificador no deben chocar entre ellas, y una organizacion borrada no debe
-- impedir que su identificador se vuelva a usar.

CREATE UNIQUE INDEX "organizations_country_code_tax_id_key"
  ON "organizations" ("country_code", "tax_id")
  WHERE "tax_id" IS NOT NULL AND "deleted_at" IS NULL;

-- ---------------------------------------------------------------------------
-- 3. El nombre de una persona, en dos columnas
-- ---------------------------------------------------------------------------
-- Las listas de usuarios se ordenan y se buscan por apellido, y con una sola
-- columna eso obliga a partir el texto en cada consulta.
--
-- El relleno corta por el primer espacio: lo que va delante es el nombre y todo
-- lo que sigue es el apellido, de modo que quien tenga dos apellidos los
-- conserva juntos. Un nombre sin espacios se queda sin apellido, que es
-- preferible a inventarle uno.

ALTER TABLE "users" ADD COLUMN "first_name" TEXT;
ALTER TABLE "users" ADD COLUMN "last_name" TEXT;

UPDATE "users"
SET
  "first_name" = CASE
    WHEN position(' ' IN "full_name") > 0 THEN split_part("full_name", ' ', 1)
    ELSE "full_name"
  END,
  "last_name" = CASE
    WHEN position(' ' IN "full_name") > 0
      THEN trim(substring("full_name" FROM position(' ' IN "full_name") + 1))
    ELSE ''
  END;

ALTER TABLE "users" ALTER COLUMN "first_name" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "last_name" SET NOT NULL;
ALTER TABLE "users" DROP COLUMN "full_name";

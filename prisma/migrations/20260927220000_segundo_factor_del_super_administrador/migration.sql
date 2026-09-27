-- Segundo factor del super administrador. ADR 0014.
--
-- La tabla users ya guardaba el secreto cifrado y la fecha de activacion. Falta
-- recordar el ultimo paso de 30 segundos aceptado, para que un mismo codigo no
-- sirva dos veces, y que la base impida estados que no tienen sentido.
--
-- Los tres estados posibles de una cuenta:
--
-- | Estado     | two_factor_secret | two_factor_enabled_at | two_factor_last_used_step |
-- | ---------- | ----------------- | --------------------- | ------------------------- |
-- | Sin alta   | nulo              | nulo                  | nulo                      |
-- | Pendiente  | cifrado           | nulo                  | nulo                      |
-- | Activo     | cifrado           | fecha                 | paso, o nulo              |
--
-- Es aditiva y se deshace con una migracion nueva que ejecute, en este orden:
--   ALTER TABLE "users" DROP CONSTRAINT "users_two_factor_step_needs_enabled";
--   ALTER TABLE "users" DROP CONSTRAINT "users_two_factor_enabled_needs_secret";
--   ALTER TABLE "users" DROP COLUMN "two_factor_last_used_step";
--
-- La restriccion users_two_factor_step_not_negative va atada a la columna y cae
-- con ella.

-- El paso es segundos desde 1970 entre 30: cabe de sobra en bigint, y nunca es
-- negativo.
ALTER TABLE "users"
  ADD COLUMN "two_factor_last_used_step" BIGINT
  CONSTRAINT "users_two_factor_step_not_negative" CHECK ("two_factor_last_used_step" >= 0);

-- Activo sin secreto seria una cuenta que dice tener segundo factor y no puede
-- generarlo: la verificacion fallaria siempre, o peor, alguien la saltaria.
ALTER TABLE "users"
  ADD CONSTRAINT "users_two_factor_enabled_needs_secret"
  CHECK ("two_factor_enabled_at" IS NULL OR "two_factor_secret" IS NOT NULL);

-- Un paso usado solo existe si hay un factor activo que lo produjo. Restablecer
-- borra los tres campos a la vez.
ALTER TABLE "users"
  ADD CONSTRAINT "users_two_factor_step_needs_enabled"
  CHECK ("two_factor_last_used_step" IS NULL OR "two_factor_enabled_at" IS NOT NULL);

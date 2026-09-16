-- Rol de aplicacion, sin privilegio para saltarse la seguridad a nivel de fila.
--
-- Por que existe: la aplicacion se conectaba con el rol dueno de las tablas, que
-- tiene BYPASSRLS y pertenece a neon_superuser, que tambien lo tiene. Con ese rol
-- una politica se escribe pero no se aplica nunca. Ver ADR 0010.
--
-- Se crea por SQL y NO desde la consola de Neon: los roles creados alli heredan
-- neon_superuser, y volveriamos al mismo problema.
--
-- Como se ejecuta, con la cadena del rol dueno y una vez por base:
--
--   psql "<cadena del rol dueno>" -v app_password="contrasena" -f scripts/db/app-role.sql
--
-- La contrasena la genera la persona, no este archivo, y se guarda donde se
-- guardan los secretos. Llega como variable de psql, asi que no queda en el
-- repositorio. Ver docs/standards/configuration-and-secrets.md
--
-- Es idempotente: se puede volver a ejecutar, y hay que hacerlo despues de
-- recrear el esquema, porque las concesiones se van con las tablas.

\set ON_ERROR_STOP on

-- ---------------------------------------------------------------------------
-- 1. El rol. NOBYPASSRLS es el motivo de todo este archivo.
-- ---------------------------------------------------------------------------

SELECT NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'inventory_app') AS falta_el_rol
\gset

\if :falta_el_rol
CREATE ROLE inventory_app LOGIN PASSWORD :'app_password';
\else
ALTER ROLE inventory_app LOGIN PASSWORD :'app_password';
\endif

ALTER ROLE inventory_app NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;

-- ---------------------------------------------------------------------------
-- 2. Lo que puede hacer: leer y escribir datos. Nada de estructura.
--
-- Sin CREATE sobre el esquema, asi que no puede crear ni alterar tablas, ni
-- desactivar una politica. Las migraciones siguen corriendo con el rol dueno.
-- ---------------------------------------------------------------------------

SELECT format('GRANT CONNECT ON DATABASE %I TO inventory_app', current_database())
\gexec

GRANT USAGE ON SCHEMA public TO inventory_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO inventory_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO inventory_app;

-- Lo que se cree despues tambien, para que una migracion nueva no deje a la
-- aplicacion sin acceso a su propia tabla.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO inventory_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO inventory_app;

-- ---------------------------------------------------------------------------
-- 3. Comprobacion. Si esto no dice lo esperado, la barrera no existe.
-- ---------------------------------------------------------------------------

SELECT rolname, rolbypassrls AS salta_rls, rolsuper AS superusuario
FROM pg_roles
WHERE rolname = 'inventory_app';

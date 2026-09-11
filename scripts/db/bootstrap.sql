-- Preparación de PostgreSQL para desarrollo local.
--
-- Ejecutar UNA sola vez, como superusuario, desde la carpeta del proyecto:
--   psql -U postgres -f scripts/db/bootstrap.sql
--
-- Las contraseñas de abajo son de desarrollo local y deliberadamente triviales.
-- Coinciden con las del archivo .env. Ninguna credencial real vive aquí.
-- Reglas completas en docs/standards/configuration-and-secrets.md

-- ---------------------------------------------------------------------------
-- Roles. Dos credenciales distintas, según la regla de mínimo privilegio:
-- el migrador crea y altera estructura, la aplicación solo lee y escribe datos.
-- ---------------------------------------------------------------------------

CREATE ROLE inventario_migrator WITH LOGIN PASSWORD 'dev_migrator_local';
CREATE ROLE inventario_app      WITH LOGIN PASSWORD 'dev_app_local';

-- La aplicación NUNCA debe poder saltarse la seguridad a nivel de fila.
-- Sin esto, el aislamiento entre empresas dependería solo del código.
ALTER ROLE inventario_app NOBYPASSRLS;

-- Solo en desarrollo. Prisma crea y destruye una base espejo en cada migración
-- para detectar cambios manuales en el esquema. En producción se usa
-- "prisma migrate deploy", que no necesita base espejo, así que allí este
-- privilegio NO se concede.
ALTER ROLE inventario_migrator CREATEDB;

-- ---------------------------------------------------------------------------
-- Bases de datos. La de pruebas es independiente para que la suite de
-- integración pueda vaciarla sin tocar los datos de desarrollo.
-- ---------------------------------------------------------------------------

CREATE DATABASE inventario_dev  OWNER inventario_migrator ENCODING 'UTF8';
CREATE DATABASE inventario_test OWNER inventario_migrator ENCODING 'UTF8';

-- ---------------------------------------------------------------------------
-- Configuración de la base de desarrollo
-- ---------------------------------------------------------------------------

\connect inventario_dev

-- Búsqueda por similitud para el buscador de productos, sin recorrer la tabla.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- Ignora acentos en la búsqueda: "articulo" encuentra "artículo".
CREATE EXTENSION IF NOT EXISTS unaccent;

GRANT CONNECT ON DATABASE inventario_dev TO inventario_app;
GRANT USAGE ON SCHEMA public TO inventario_app;

-- Las migraciones crean tablas nuevas constantemente. Sin privilegios por
-- omisión, cada migración dejaría fuera a la aplicación hasta conceder permisos
-- a mano. Esto lo resuelve de una vez para todas las tablas futuras.
ALTER DEFAULT PRIVILEGES FOR ROLE inventario_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO inventario_app;
ALTER DEFAULT PRIVILEGES FOR ROLE inventario_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO inventario_app;

-- ---------------------------------------------------------------------------
-- Configuración de la base de pruebas
-- ---------------------------------------------------------------------------

\connect inventario_test

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

GRANT CONNECT ON DATABASE inventario_test TO inventario_app;
GRANT USAGE ON SCHEMA public TO inventario_app;

ALTER DEFAULT PRIVILEGES FOR ROLE inventario_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO inventario_app;
ALTER DEFAULT PRIVILEGES FOR ROLE inventario_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO inventario_app;

\echo 'Listo. Bases inventario_dev e inventario_test creadas con sus roles.'

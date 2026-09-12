# Inventory Management

Sistema de control de inventarios web y responsive. Multiempresa, multipaís y
multimoneda, con rastreo por lote y por número de serie.

La primera versión cubre existencias, compras y ventas.

## Estado

En construcción. El modelo de datos y las reglas de arquitectura están completos. La
aplicación tiene el andamiaje montado y una página provisional.

| Pieza                               | Estado    |
| ----------------------------------- | --------- |
| Reglas de arquitectura y de negocio | Completas |
| Modelo de datos y migraciones       | Completo  |
| Semillas                            | Completas |
| Andamiaje de Next.js                | Completo  |
| Prototipo de diseño                 | En curso  |
| Módulo de configuración             | Pendiente |
| Traducciones                        | Pendiente |
| Autenticación y autorización        | Pendiente |
| Módulos de negocio                  | Pendiente |

## Stack

TypeScript en modo estricto, Next.js con enrutador de aplicación, React con componentes
de servidor, PostgreSQL 18, Prisma, Zod, Tailwind CSS.

Las razones de cada elección están en [docs/adr](docs/adr/).

## Requisitos

- Node.js 22 o superior
- PostgreSQL 18, instalado de forma nativa
- Git

## Puesta en marcha

1. **Instala las dependencias.**

   ```bash
   npm install
   ```

2. **Crea las bases de datos y los roles.** Pide la contraseña que definiste al instalar
   PostgreSQL. Crea dos bases, desarrollo y pruebas, con roles separados para la
   aplicación y para las migraciones.

   ```bash
   psql -U postgres -f scripts/db/bootstrap.sql
   ```

3. **Configura el entorno.** Copia la plantilla y rellena los valores. Cada variable está
   documentada en el propio archivo.

   ```bash
   cp .env.example .env
   ```

4. **Aplica las migraciones.**

   ```bash
   npm run db:migrate
   ```

5. **Siembra los datos base.** Países, monedas, catálogo de permisos y la primera cuenta
   de super administrador.

   ```bash
   npm run db:seed
   ```

6. **Levanta la aplicación.** Queda en `http://localhost:3000`.

   ```bash
   npm run dev
   ```

## Guiones disponibles

| Guion                      | Qué hace                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `npm run dev`              | Levanta la aplicación en modo desarrollo                                               |
| `npm run build`            | Compila para producción                                                                |
| `npm run verify`           | Formato, linter, tipos y pruebas unitarias. Lo mismo que corre en integración continua |
| `npm run test`             | Pruebas unitarias                                                                      |
| `npm run test:integration` | Pruebas de integración contra PostgreSQL real                                          |
| `npm run test:e2e`         | Pruebas de extremo a extremo en navegador                                              |
| `npm run db:migrate`       | Crea y aplica una migración                                                            |
| `npm run db:seed`          | Siembra los datos base                                                                 |
| `npm run db:studio`        | Abre el explorador visual de la base de datos                                          |
| `npm run secrets:scan`     | Busca credenciales filtradas en el código                                              |

## Cómo contribuir

Antes de escribir código, lee [CLAUDE.md](CLAUDE.md). Contiene las reglas de arquitectura,
la estructura de carpetas y los criterios de entrega.

Las reglas específicas por capa están en [.claude/agents](.claude/agents/). Sirven tanto
como manual de referencia para personas como de instrucciones para agentes.

- [Índice de documentación](docs/README.md)
- [Reglas de negocio](docs/architecture/reglas-de-negocio.md)
- [Decisiones de arquitectura](docs/adr/)
- [Convenciones de Git](docs/standards/git-conventions.md)
- [Configuración y secretos](docs/standards/configuration-and-secrets.md)

## Seguridad

Nunca se escriben credenciales, URLs ni cadenas de conexión en el código. El linter y el
gancho de precommit lo verifican de forma automática. Si encuentras una credencial en el
repositorio, se considera comprometida: rótala de inmediato y avisa.

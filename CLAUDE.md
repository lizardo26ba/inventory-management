# Sistema de Inventario — Reglas de Arquitectura

Documento raíz. Toda contribución, humana o de agente, debe cumplir estas reglas.
Las reglas específicas por capa viven en `.claude/agents/`. Las reglas de documentación
viven en `docs/standards/`.

## 0. Alcance y decisiones tomadas

Sistema de inventario web y responsive, **multiempresa desde el inicio**. La primera
versión funcional cubre existencias, compras y ventas.

| Decisión             | Resultado                                                                          | Registro                                                                    |
| -------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Stack                | Next.js, PostgreSQL, Prisma, TypeScript                                            | [ADR 0001](docs/adr/0001-stack-tecnologico.md)                              |
| Existencias          | Libro de movimientos inmutable con saldo materializado                             | [ADR 0002](docs/adr/0002-existencias-como-libro-de-movimientos.md)          |
| Multiempresa         | Base compartida con `organization_id` en toda tabla de negocio                     | [ADR 0003](docs/adr/0003-multiempresa-con-identificador-de-organizacion.md) |
| Autenticación        | Credenciales propias con Argon2id y sesión en base de datos                        | [ADR 0007](docs/adr/0007-sesion-propia-sin-libreria-de-autenticacion.md)    |
| Super administrador  | Acceso transversal, con segundo factor y auditoría obligatorios                    | [ADR 0005](docs/adr/0005-super-administrador-de-plataforma.md)              |
| Multipaís            | Moneda base por organización, tasa congelada en cada documento                     | [ADR 0006](docs/adr/0006-operacion-multipais-y-multimoneda.md)              |
| Integración          | Rama de Neon dedicada, recreada en cada ejecución                                  | [ADR 0009](docs/adr/0009-pruebas-de-integracion-en-rama-de-neon.md)         |
| Integración continua | GitHub Actions con PostgreSQL en contenedor; auditoría con excepciones que caducan | [ADR 0011](docs/adr/0011-integracion-continua-en-github-actions.md)         |
| Despliegue           | Local por ahora. Contenedor listo para Azure más adelante                          | Pendiente                                                                   |

Dominios de la primera versión: organizaciones y usuarios, roles y permisos, catálogo de
productos, almacenes, movimientos de existencias, proveedores y compras, clientes y
ventas, y bitácora de auditoría.

## 1. Stack aprobado

| Capa          | Tecnología                                        | No usar                           |
| ------------- | ------------------------------------------------- | --------------------------------- |
| Lenguaje      | TypeScript en modo `strict`                       | JavaScript plano                  |
| Framework     | Next.js (App Router)                              | Pages Router                      |
| UI            | React Server Components, Tailwind CSS, shadcn/ui  | CSS-in-JS en runtime              |
| ORM           | Prisma                                            | Consultas SQL concatenadas        |
| Base de datos | PostgreSQL                                        | NoSQL para datos transaccionales  |
| Validación    | Zod (esquemas compartidos cliente/servidor)       | Validación solo en cliente        |
| Autenticación | Sesión propia en base de datos                    | Auth.js, tokens en `localStorage` |
| Pruebas       | Vitest, rama de Neon para integración, Playwright | Pruebas contra base de producción |

Cualquier dependencia nueva requiere un ADR (ver `docs/standards/documentation-rules.md`).

## 2. Principios innegociables

1. **Denegar por defecto.** Ninguna operación se ejecuta sin verificación explícita de
   sesión y permiso en el servidor. Ocultar controles en la interfaz no es autorización.
2. **La frontera valida.** Todo dato que cruza al servidor pasa por un esquema Zod antes
   de tocar lógica de negocio.
3. **El stock es un libro mayor, no un número.** Las existencias se derivan de movimientos
   inmutables. Nunca se sobrescribe una cantidad.
4. **La base de datos defiende las invariantes.** Las reglas críticas se expresan como
   restricciones, no solo como código de aplicación.
5. **El servidor renderiza.** El cliente recibe datos ya resueltos. Se usa `'use client'`
   únicamente en componentes hoja que necesitan interactividad.
6. **Nada silencioso.** Un error se registra, se propaga con contexto y se muestra al
   usuario en su idioma. Prohibido `catch` vacío.
7. **Reversible antes que perfecto.** Migraciones hacia adelante, despliegues con
   posibilidad de retroceso, cambios pequeños.
8. **Cero valores quemados.** Ninguna URL, clave, identificador de cliente, contraseña
   ni cadena de conexión aparece en el código. Todo valor se clasifica y se ubica según
   `docs/standards/configuration-and-secrets.md`, y `process.env` solo se lee dentro del
   módulo de configuración.
9. **Primero el prototipo, después el componente, al final la aplicación.** Ninguna pieza
   visual entra en una pantalla real antes de existir en el prototipo y antes de existir
   como componente compartido en `src/components/ui`. El orden no se salta ni se invierte.
   Ver `docs/standards/prototype-and-components.md`.

## 3. Estructura de carpetas

```
src/
  app/                    Rutas Next.js. Solo composición y layout.
    (auth)/               Rutas públicas de autenticación.
    (dashboard)/          Rutas protegidas.
    api/                  Solo webhooks y endpoints para terceros.
  modules/                Un directorio por dominio (products, warehouses,
                          inventory, users, audit). Cada uno contiene:
    <dominio>/
      actions.ts          Server Actions. Delgadas: validan, autorizan, delegan.
      service.ts          Lógica de negocio pura. Sin imports de Next.js.
      repository.ts       Único lugar con acceso a Prisma.
      schema.ts           Esquemas Zod compartidos.
      types.ts            Tipos y DTOs del dominio.
      components/         UI propia del dominio.
  lib/
    auth/                 Sesión, permisos, wrappers de autorización.
    config/               Único lugar del proyecto que lee process.env.
    db/                   Cliente Prisma, transacciones, helpers de paginación.
    errors/               Jerarquía de errores y mapeo a respuestas.
    observability/        Logger, métricas, trazas.
  components/ui/          Primitivas compartidas sin lógica de negocio.
prisma/
  schema.prisma
  migrations/
tests/
  unit/  integration/  e2e/
docs/
  standards/  adr/  diagrams/
```

**Regla de dependencias.** `app` puede importar de `modules`, `lib` y `components`.
`modules` puede importar de `lib`. `lib` no importa de `modules` ni de `app`.
Un módulo no importa el `repository` ni el `service` de otro módulo: se comunica
por la interfaz pública declarada en su `index.ts`.

## 4. Convenciones transversales

- Archivos y carpetas en `kebab-case`. Componentes React en `PascalCase`.
- Funciones y variables en `camelCase`. Constantes de módulo en `UPPER_SNAKE_CASE`.
- Los nombres describen intención de negocio, no implementación: `registerStockExit`,
  no `updateQty`.
- Prohibido el tipo `any`. Si el tipo es desconocido, se usa `unknown` y se estrecha.
- Prohibidos los números y cadenas mágicos. Se declaran como constantes con nombre.
- Toda función exportada tiene tipo de retorno explícito.
- Los comentarios explican el porqué. El qué lo explica el código.
- **Todo instante se guarda en tiempo universal coordinado, y lo que se guarda es el
  momento actual en esa escala:** `new Date()` en el código, `now()` en SQL. La zona
  horaria se aplica al presentar y al cortar informes, nunca al guardar. Una operación
  llama al reloj una sola vez y reparte ese instante.
  Ver `docs/standards/dates-and-times.md`.

## 5. Definition of Done

Un cambio está terminado cuando cumple todo lo siguiente:

- [ ] Tipos, formato y linter pasan sin advertencias suprimidas.
- [ ] Pruebas unitarias de la lógica nueva y prueba de integración si toca la base.
- [ ] Verificación de permisos en servidor, con prueba negativa que confirme el rechazo.
- [ ] Sin secretos, datos personales ni identificadores reales en el código o los logs.
- [ ] Migración reversible y probada sobre una copia con datos representativos.
- [ ] Toda pieza visual nueva pasó por el prototipo y por `src/components/ui` antes de
      llegar a una pantalla real.
- [ ] Documentación actualizada según `docs/standards/documentation-rules.md`.
- [ ] Sin regresión de rendimiento en las consultas afectadas.

## 6. Índice de reglas por rol

| Rol                      | Archivo                                       |
| ------------------------ | --------------------------------------------- |
| Base de datos            | `.claude/agents/database-architect.md`        |
| Backend                  | `.claude/agents/backend-engineer.md`          |
| Frontend                 | `.claude/agents/frontend-engineer.md`         |
| Pruebas y calidad        | `.claude/agents/qa-test-engineer.md`          |
| Seguridad                | `.claude/agents/security-auditor.md`          |
| Documentación            | `.claude/agents/docs-writer.md`               |
| Configuración y secretos | `docs/standards/configuration-and-secrets.md` |
| Reglas de documentación  | `docs/standards/documentation-rules.md`       |
| Prototipo y componentes  | `docs/standards/prototype-and-components.md`  |
| Fechas y horas           | `docs/standards/dates-and-times.md`           |
| Reglas de API            | `docs/standards/api-documentation-rules.md`   |
| Plantilla de ADR         | `docs/standards/adr-template.md`              |
| Convenciones de Git      | `docs/standards/git-conventions.md`           |

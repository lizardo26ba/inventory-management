# Índice de Documentación

**Audiencia:** todas
**Estado:** vigente
**Responsable:** equipo de arquitectura
**Última revisión:** 2026-09-15

Punto de entrada a la documentación del sistema de inventario. Todo documento nuevo se
registra aquí.

## Reglas y estándares

| Documento                                                          | Para qué sirve                                       |
| ------------------------------------------------------------------ | ---------------------------------------------------- |
| [Reglas de arquitectura](../CLAUDE.md)                             | Stack, principios, estructura y criterios de entrega |
| [Configuración y secretos](standards/configuration-and-secrets.md) | Dónde vive cada valor y cómo se protege              |
| [Reglas de documentación](standards/documentation-rules.md)        | Cómo se escribe y mantiene toda la documentación     |
| [Reglas de API](standards/api-documentation-rules.md)              | Cómo se documenta cada operación de servidor         |
| [Plantilla de decisión](standards/adr-template.md)                 | Formato de los registros de decisión de arquitectura |
| [Convenciones de Git](standards/git-conventions.md)                | Idioma, ramas, confirmaciones, revisión y versiones  |

## Reglas por rol

Viven en `.claude/agents/` y funcionan tanto como agentes especializados como manual de
referencia para personas.

| Rol               | Archivo                                                          |
| ----------------- | ---------------------------------------------------------------- |
| Base de datos     | [database-architect.md](../.claude/agents/database-architect.md) |
| Backend           | [backend-engineer.md](../.claude/agents/backend-engineer.md)     |
| Frontend          | [frontend-engineer.md](../.claude/agents/frontend-engineer.md)   |
| Pruebas y calidad | [qa-test-engineer.md](../.claude/agents/qa-test-engineer.md)     |
| Seguridad         | [security-auditor.md](../.claude/agents/security-auditor.md)     |
| Documentación     | [docs-writer.md](../.claude/agents/docs-writer.md)               |

## Decisiones de arquitectura

| Registro                                                                       | Decisión                                                                              |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| [0001](adr/0001-stack-tecnologico.md)                                          | Next.js, PostgreSQL y Prisma en TypeScript                                            |
| [0002](adr/0002-existencias-como-libro-de-movimientos.md)                      | Existencias como libro de movimientos inmutable                                       |
| [0003](adr/0003-multiempresa-con-identificador-de-organizacion.md)             | Multiempresa con base compartida e identificador de organización                      |
| [0004](adr/0004-autenticacion-con-credenciales-propias.md)                     | Autenticación con credenciales propias y sesión en cookie                             |
| [0005](adr/0005-super-administrador-de-plataforma.md)                          | Super administrador de plataforma con acceso transversal auditado                     |
| [0006](adr/0006-operacion-multipais-y-multimoneda.md)                          | Operación multipaís con moneda base por organización                                  |
| [0007](adr/0007-sesion-propia-sin-libreria-de-autenticacion.md)                | Sesión propia en base de datos, sustituye la parte de librería de 0004                |
| [0008](adr/0008-rastreo-por-lote-y-numero-de-serie.md)                         | Rastreo por lote y por número de serie, configurable por producto                     |
| [0009](adr/0009-pruebas-de-integracion-en-rama-de-neon.md)                     | Pruebas de integración contra una rama de Neon dedicada                               |
| [0010](adr/0010-aislamiento-con-seguridad-a-nivel-de-fila.md)                  | Seguridad a nivel de fila con un rol de aplicación sin privilegio de salto            |
| [0011](adr/0011-integracion-continua-en-github-actions.md)                     | Integración continua en GitHub Actions, con PostgreSQL en contenedor                  |
| [0012](adr/0012-fusion-con-combinacion-normal-y-sin-aprobacion-obligatoria.md) | Fusión con combinación normal, sin aprobación obligatoria con una sola persona        |
| [0013](adr/0013-empresa-activa-en-la-sesion.md)                                | La empresa activa en la sesión, y lo que la base ve antes y después de elegirla       |
| [0014](adr/0014-segundo-factor-del-super-administrador.md)                     | Segundo factor del super administrador con app autenticadora, sin códigos de respaldo |
| [0015](adr/0015-auditoria-de-consultas-del-super-administrador.md)             | Auditoría de las consultas del super administrador. Sustituida por 0018               |
| [0016](adr/0016-despliegue-en-vercel-hasta-azure.md)                           | Despliegue en Vercel con Neon como etapa temporal hasta Azure                         |
| [0017](adr/0017-bitacora-de-toda-la-actividad-sin-purga.md)                    | La bitácora registra las consultas de todos los usuarios. Sustituida por 0018         |
| [0018](adr/0018-bitacora-de-cambios-sin-purga.md)                              | La bitácora guarda los cambios de todos los usuarios, no las consultas, y no se purga |

## Arquitectura

| Documento                                     | Para qué sirve                                              |
| --------------------------------------------- | ----------------------------------------------------------- |
| [Seguridad](architecture/security.md)         | Quién puede hacer qué: alcances, roles y matriz de permisos |
| [Modelo de datos](architecture/data-model.md) | Qué guarda cada tabla y qué invariante defiende la base     |

## Negocio

| Documento                                              | Para qué sirve                                                             |
| ------------------------------------------------------ | -------------------------------------------------------------------------- |
| [Reglas de negocio](architecture/reglas-de-negocio.md) | Catálogo numerado de lo que el sistema hace cumplir, y qué falta confirmar |

## Evaluaciones

| Documento                                                       | Pregunta que responde                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [PostgreSQL frente a MongoDB](architecture/evaluacion-nosql.md) | Qué costaría llevar el diseño a NoSQL y qué garantías habría que rehacer |

## Documentos pendientes de crear

Se generan conforme avance la implementación, siguiendo la estructura definida en las
reglas de documentación.

- `architecture/overview.md`
- `guides/getting-started.md`
- `guides/contributing.md`
- `guides/deployment.md`
- `guides/operations.md`
- `guides/troubleshooting.md`
- `api/README.md`
- `user/manual.md`

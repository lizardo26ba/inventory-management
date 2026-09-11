# Reglas de Documentación

Normativa obligatoria para toda la documentación del sistema de inventario. Aplica a
personas y a agentes por igual.

## 1. Principios

1. **La documentación es parte del código.** Vive en el repositorio, se revisa en la
   misma propuesta de cambio y se versiona junto a lo que describe.
2. **Una sola fuente de verdad.** Cada hecho se escribe en un único lugar. En los demás
   se enlaza. La duplicación garantiza divergencia.
3. **Documentación desactualizada es un defecto.** Se reporta y se corrige como cualquier
   otro error.
4. **Documenta el porqué.** El código explica qué hace y cómo. Solo una persona puede
   explicar por qué se eligió así y qué alternativas se descartaron.
5. **Sin audiencia no hay documento.** Todo archivo declara para quién es en su primera
   línea.
6. **Ejemplo verificado o ningún ejemplo.**

## 2. Estructura del repositorio de documentación

```
README.md                      Puerta de entrada. Qué es, cómo se levanta en local.
CLAUDE.md                      Reglas de arquitectura y convenciones.
CHANGELOG.md                   Historial de versiones para personas.
docs/
  README.md                    Índice navegable de toda la documentación.
  architecture/
    overview.md                Visión general y diagramas de contexto y contenedores.
    data-model.md              Diccionario de datos y diagrama entidad relación.
    security.md                Modelo de amenazas, autenticación y matriz de permisos.
    decisions.md               Índice de registros de decisión.
  guides/
    getting-started.md         Puesta en marcha del entorno local paso a paso.
    contributing.md            Flujo de trabajo, ramas, revisión y criterios de fusión.
    deployment.md              Despliegue por entorno, variables y reversión.
    operations.md              Respaldos, monitoreo, alertas y manual de incidentes.
    troubleshooting.md         Síntoma, causa probable y solución.
  api/
    README.md                  Referencia de acciones de servidor y endpoints.
  user/
    manual.md                  Manual funcional para quien usa el sistema.
    faq.md                     Preguntas frecuentes del negocio.
  adr/
    0001-<titulo-en-kebab>.md  Un archivo por decisión, numerado y correlativo.
  standards/
    documentation-rules.md     Este archivo.
    api-documentation-rules.md
    adr-template.md
    git-conventions.md
  diagrams/                    Fuentes de diagramas que no caben en línea.
```

## 3. Formato

- Markdown con un solo encabezado de primer nivel por archivo.
- Ancho de línea máximo de cien caracteres para que las diferencias sean legibles.
- Todo bloque de código lleva el lenguaje declarado.
- Los comandos van en bloques separados, uno por bloque, sin el símbolo del intérprete al
  inicio ni la salida mezclada dentro.
- Las tablas se usan para datos comparables. Las listas para elementos paralelos. La
  prosa para razonamientos.
- Los nombres de archivo en minúsculas con guiones.
- Los enlaces internos son relativos y apuntan a archivos del repositorio.
- Los diagramas se escriben en Mermaid en el propio archivo. Si un diagrama no cabe, su
  fuente va en `docs/diagrams/` y se enlaza; nunca solo la imagen exportada.

## 4. Encabezado obligatorio

Todo documento de `docs/` empieza con este bloque:

```markdown
# Título del documento

**Audiencia:** desarrollo | operaciones | negocio | usuario final
**Estado:** vigente | en revisión | obsoleto
**Responsable:** equipo o persona
**Última revisión:** AAAA-MM-DD

Una o dos frases que digan qué resuelve este documento y qué podrá hacer quien lo lea.
```

Un documento marcado como obsoleto lleva en su primera sección un aviso con el enlace al
que lo reemplaza. No se borra si hay enlaces externos apuntándole.

## 5. Comentarios en el código

- El comentario explica la razón, la restricción o la sutileza, nunca lo que la línea ya
  dice.
- Toda función exportada lleva TSDoc con propósito, parámetros no evidentes, valor de
  retorno y errores que puede producir.
- Toda regla de negocio no obvia lleva un comentario que la justifique y, si existe,
  enlace al registro de decisión correspondiente.
- Todo uso de una consulta sin procesar, de un tipo forzado o de una supresión del linter
  lleva comentario con el motivo. Sin motivo, no se aprueba.
- Los marcadores de tarea pendiente incluyen responsable y referencia de seguimiento. Un
  marcador huérfano se elimina.
- Prohibido el código comentado. El historial de versiones ya lo conserva.

## 6. Documentación por tipo de cambio

| Cambio                                   | Documento a actualizar                               |
| ---------------------------------------- | ---------------------------------------------------- |
| Esquema de base de datos                 | Diccionario de datos y diagrama entidad relación     |
| Acción de servidor o endpoint            | Referencia de API                                    |
| Decisión estructural o dependencia nueva | Registro de decisión y su índice                     |
| Permiso o rol                            | Matriz de permisos en el documento de seguridad      |
| Flujo visible para el usuario            | Manual de usuario y notas de versión                 |
| Variable de entorno o despliegue         | Guía de despliegue y de operación                    |
| Incidente resuelto                       | Guía de resolución de problemas y análisis posterior |

## 7. Registros de decisión de arquitectura

- Se escribe un registro cuando la decisión es costosa de revertir, afecta a más de un
  módulo, introduce una dependencia o rechaza una alternativa razonable.
- Numeración correlativa que nunca se reutiliza.
- Un registro aceptado **no se edita**. Si la decisión cambia, se escribe uno nuevo que
  la reemplace y se marca el anterior como sustituido, con enlace en ambos sentidos.
- Plantilla obligatoria en `adr-template.md`.

## 8. Historial de versiones

- Formato de historial legible por personas, con versionado semántico.
- Secciones por versión: añadido, cambiado, obsoleto, eliminado, corregido y seguridad.
- Se escribe desde la perspectiva de quien usa el sistema, no desde el detalle técnico.
  Se describe el efecto, no el archivo modificado.
- Los cambios que rompen compatibilidad se marcan de forma destacada e incluyen la guía
  de migración.

## 9. Manual de usuario

- Organizado por tarea del negocio, no por pantalla del sistema.
- Cada tarea indica qué permiso requiere.
- Capturas de pantalla solo cuando la descripción textual no basta, con datos ficticios y
  con nota de la versión en que se tomaron.
- Incluye qué hacer cuando algo sale mal, por ejemplo al recibir un aviso de conflicto de
  edición simultánea.

## 10. Verificación en integración continua

- Comprobación automática de enlaces rotos.
- Análisis del formato Markdown.
- Validación de la sintaxis de los diagramas Mermaid.
- Alerta cuando un documento supera seis meses sin revisión.
- Bloqueo de la fusión si el cambio toca el esquema, un contrato o un permiso y no
  incluye la actualización documental correspondiente.

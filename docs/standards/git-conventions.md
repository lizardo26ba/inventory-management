# Convenciones de Git y Revisión

**Audiencia:** desarrollo
**Estado:** vigente
**Responsable:** equipo de arquitectura
**Última revisión:** 2026-09-27

## 1. Idioma

Todo lo que queda en Git y en GitHub se escribe en **inglés**:

- nombres de rama;
- mensajes de confirmación, resumen y cuerpo;
- título y descripción de las propuestas de cambio;
- comentarios de revisión, incidencias, etiquetas y notas de versión en GitHub.

El motivo es que ese historial lo leen herramientas y personas de fuera del equipo, y el
inglés es el idioma común de ambos.

La regla no alcanza al contenido del repositorio, que sigue su propia norma: la
documentación y los comentarios del código se escriben en español, según
`.claude/agents/docs-writer.md`, y los textos de la interfaz, en el idioma de cada usuario.

Como se fusiona con combinación normal, cada confirmación de una rama llega a la rama
principal tal cual, así que la regla alcanza a todas, no solo al título de la propuesta.
Lo escrito antes de esta regla no se reescribe.

## 2. Ramas

- La rama principal siempre está desplegable. Nadie escribe directamente en ella.
- Una rama por unidad de trabajo, con nombre `tipo/descripcion-corta`, por ejemplo
  `feat/stock-transfer-registration` o `fix/negative-balance-on-adjustment`.
- Vida corta. Si una rama supera unos pocos días, el cambio es demasiado grande y debe
  dividirse.
- Se integra la rama principal con frecuencia para evitar conflictos acumulados.

## 3. Mensajes de confirmación

Formato de confirmaciones convencionales:

```
type(scope): imperative summary in lowercase

Optional body that explains why the change was made, not what changed. The
diff already shows what. Mention the rejected alternative, if there was one.

Refs: #123
```

Tipos permitidos: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`,
`chore`, `revert`.

Reglas:

- El resumen no supera los setenta y dos caracteres y no termina en punto.
- El alcance es el módulo de dominio, por ejemplo `inventory`, `products`, `auth`.
- Un cambio que rompe compatibilidad lleva `!` tras el alcance y una nota al final que
  explica la ruptura y la migración.
- Una confirmación equivale a un cambio coherente. Prohibido mezclar reformateo con
  cambio funcional en la misma confirmación, porque hace ilegible la revisión.
- Prohibido confirmar código comentado, archivos generados, secretos o dependencias sin
  justificación.

## 4. Propuestas de cambio

- Título con el mismo formato que el mensaje de confirmación.
- La descripción responde: qué problema resuelve, cómo se resolvió, qué alternativas se
  descartaron, cómo se verificó y qué riesgo tiene.
- Se enlaza el registro de decisión si el cambio es estructural.
- Se incluye captura o grabación si hay cambio visible en la interfaz.
- Se marca la lista de verificación de la definición de trabajo terminado del archivo
  raíz de reglas.
- Tamaño objetivo por debajo de cuatrocientas líneas modificadas. Por encima, la revisión
  pierde eficacia y conviene dividir.

## 5. Revisión de código

Quien revisa comprueba, en este orden de prioridad:

1. **Corrección y seguridad.** Autorización presente, entrada validada, transacción
   correcta, concurrencia contemplada.
2. **Diseño.** Responsabilidad en la capa adecuada, sin dependencias que crucen los
   límites declarados, sin abstracción especulativa.
3. **Pruebas.** Existen los casos negativos y la prueba fallaría si se revierte el
   código.
4. **Legibilidad.** Nombres que dicen la intención, funciones cortas, sin sorpresas.
5. **Documentación.** Actualizada según la tabla de tipos de cambio.

Normas de convivencia: los comentarios se dirigen al código, nunca a la persona. Toda
objeción propone una alternativa concreta. Las sugerencias opcionales se marcan como
tales para distinguirlas de lo bloqueante.

## 6. Fusión y versiones

- Se fusiona con combinación normal: las confirmaciones de la rama llegan a la rama
  principal tal cual, y la confirmación de combinación lleva el título y la descripción de
  la propuesta. Ver
  [ADR 0012](../adr/0012-fusion-con-combinacion-normal-y-sin-aprobacion-obligatoria.md).
- Requisitos para fusionar: integración continua en verde, al menos una aprobación, y
  para cambios en autenticación, permisos o cálculo de existencias, aprobación adicional
  de una persona con responsabilidad de arquitectura. Los dos requisitos de aprobación
  están suspendidos mientras el equipo sea de una sola persona, según el ADR 0012.
- Versionado semántico. Las etiquetas se generan desde el historial de confirmaciones
  convencionales.
- Toda versión desplegada tiene su entrada en el historial de cambios y un plan de
  reversión probado.

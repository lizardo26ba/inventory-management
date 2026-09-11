# Convenciones de Git y Revisión

**Audiencia:** desarrollo
**Estado:** vigente
**Responsable:** equipo de arquitectura
**Última revisión:** 2026-09-10

## 1. Ramas

- La rama principal siempre está desplegable. Nadie escribe directamente en ella.
- Una rama por unidad de trabajo, con nombre `tipo/descripcion-corta`, por ejemplo
  `feat/registro-de-transferencias` o `fix/saldo-negativo-en-ajuste`.
- Vida corta. Si una rama supera unos pocos días, el cambio es demasiado grande y debe
  dividirse.
- Se integra la rama principal con frecuencia para evitar conflictos acumulados.

## 2. Mensajes de confirmación

Formato de confirmaciones convencionales:

```
tipo(alcance): resumen en imperativo y minúscula

Cuerpo opcional que explica el porqué del cambio, no el qué. El qué ya está
en el diff. Menciona la alternativa descartada si la hubo.

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

## 3. Propuestas de cambio

- Título con el mismo formato que el mensaje de confirmación.
- La descripción responde: qué problema resuelve, cómo se resolvió, qué alternativas se
  descartaron, cómo se verificó y qué riesgo tiene.
- Se enlaza el registro de decisión si el cambio es estructural.
- Se incluye captura o grabación si hay cambio visible en la interfaz.
- Se marca la lista de verificación de la definición de trabajo terminado del archivo
  raíz de reglas.
- Tamaño objetivo por debajo de cuatrocientas líneas modificadas. Por encima, la revisión
  pierde eficacia y conviene dividir.

## 4. Revisión de código

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

## 5. Fusión y versiones

- Se fusiona con confirmación de combinación aplastada, para que la rama principal tenga
  un historial de una entrada por unidad de trabajo.
- Requisitos para fusionar: integración continua en verde, al menos una aprobación, y
  para cambios en autenticación, permisos o cálculo de existencias, aprobación adicional
  de una persona con responsabilidad de arquitectura.
- Versionado semántico. Las etiquetas se generan desde el historial de confirmaciones
  convencionales.
- Toda versión desplegada tiene su entrada en el historial de cambios y un plan de
  reversión probado.

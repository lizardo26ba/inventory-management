# Plantilla de Registro de Decisión de Arquitectura

**Audiencia:** desarrollo
**Estado:** vigente
**Responsable:** equipo de arquitectura
**Última revisión:** 2026-09-10

Copia el bloque de abajo a `docs/adr/NNNN-titulo-en-kebab.md`, con numeración correlativa
que nunca se reutiliza. Un registro aceptado no se edita: si la decisión cambia, se
escribe uno nuevo que lo reemplace y se enlazan entre sí en ambos sentidos.

## Cuándo escribir un registro

Escribe uno si la decisión cumple al menos una condición:

- Es costosa de revertir.
- Afecta a más de un módulo o a la forma del despliegue.
- Introduce, reemplaza o elimina una dependencia.
- Rechaza una alternativa que otra persona razonable habría elegido.
- Establece una regla que otros deberán seguir.

No escribas uno para elecciones locales y reversibles dentro de un módulo.

---

## Plantilla

```markdown
# NNNN. Título en forma de decisión, no de pregunta

**Estado:** propuesta | aceptada | rechazada | sustituida por [NNNN](NNNN-otro.md)
**Fecha:** AAAA-MM-DD
**Decide:** personas o equipo
**Consultados:** quienes aportaron información
**Relacionadas:** [NNNN](NNNN-otra.md)

## Contexto

Cuál es la situación y qué fuerzas están en tensión. Restricciones reales del proyecto:
plazo, presupuesto, tamaño y experiencia del equipo, requisitos de cumplimiento, volumen
esperado. Datos medidos si existen. Sin justificar todavía ninguna opción.

## Decisión

Qué se decide, en voz activa y presente. Una frase clara, seguida del alcance exacto y de
lo que queda explícitamente fuera.

## Alternativas consideradas

### Alternativa A

Descripción breve. A favor. En contra. Por qué se descartó.

### Alternativa B

Descripción breve. A favor. En contra. Por qué se descartó.

Una alternativa descartada sin motivo escrito equivale a no haberla considerado.

## Consecuencias

**Positivas.** Qué mejora y qué habilita.

**Negativas.** Qué empeora, qué complejidad se acepta, qué deuda se contrae. Este
apartado no puede quedar vacío: toda decisión tiene coste.

**Neutras.** Qué cambia sin ser mejor ni peor, como convenciones o herramientas nuevas.

## Impacto

- Seguridad: nuevas superficies de ataque o controles necesarios.
- Rendimiento y escalabilidad: efecto esperado y cómo se medirá.
- Operación: cambios en despliegue, monitoreo o respaldos.
- Coste: efecto en la factura de infraestructura o licencias.
- Migración: qué hay que cambiar en lo existente y en qué plazo.

## Cumplimiento

Cómo se hará respetar esta decisión: regla de linter, prueba automatizada, punto de la
revisión de código, o comprobación en integración continua. Una decisión sin mecanismo de
cumplimiento se erosiona en pocos meses.

## Revisión

Cuándo conviene reconsiderar esta decisión y qué señal la dispararía, por ejemplo superar
un volumen determinado de movimientos o un percentil de latencia.
```

---

## Registro de ejemplo abreviado

```markdown
# 0003. Modelar las existencias como libro de movimientos inmutable

**Estado:** aceptada
**Fecha:** 2026-09-10

## Contexto

Varios usuarios registran entradas y salidas del mismo producto de forma simultánea.
Actualizar una columna de cantidad genera contención sobre una única fila y hace imposible
auditar cómo se llegó al saldo actual.

## Decisión

Las existencias se derivan de una tabla de movimientos de solo inserción. El saldo se
materializa en una tabla aparte, actualizada dentro de la misma transacción.

## Alternativas consideradas

Columna de cantidad con bloqueo pesimista. Más simple, pero serializa a todos los
usuarios sobre el producto más movido y no deja historial. Descartada por rendimiento y
por requisito de auditoría.

## Consecuencias

Positivas: historial completo, auditoría natural, menor contención, saldo recalculable
como verificación.
Negativas: más escrituras por operación, necesidad de un proceso de conciliación y de
depuración por antigüedad de los movimientos.

## Cumplimiento

Regla en la revisión de código y prueba automatizada que falla si algún repositorio
actualiza la cantidad directamente.
```

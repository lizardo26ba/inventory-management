# 0012. Fusionar con combinación normal, y sin aprobación obligatoria mientras el equipo sea de una sola persona

**Estado:** aceptada
**Fecha:** 2026-09-27
**Decide:** propietario del producto
**Consultados:** equipo de arquitectura
**Relacionadas:** [0011](0011-integracion-continua-en-github-actions.md)

## Contexto

Las convenciones de Git pedían dos cosas que, al configurar la protección de `main`,
resultaron no encajar con el proyecto.

**El método de fusión.** Pedían la combinación aplastada, que deja una sola entrada en `main`
por propuesta. El propietario del producto prefiere conservar en `main` las confirmaciones de
cada rama tal como se escribieron, que ya están divididas en cambios coherentes y explican cada
paso. Las fusiones hechas hasta hoy usaron la combinación normal.

**Las aprobaciones.** Pedían al menos una aprobación para fusionar, y para los cambios en
autenticación, permisos o cálculo de existencias, otra de una persona con responsabilidad de
arquitectura. Hoy el proyecto lo lleva una sola persona, y GitHub no permite que el autor
apruebe su propia propuesta. Con la aprobación exigida no se podría fusionar nada, salvo
saltándose la regla como administrador en cada fusión.

## Decisión

**Se fusiona con combinación normal.** Las confirmaciones de la rama llegan a `main` tal
cual, y la confirmación de combinación lleva como mensaje el título y la descripción de la
propuesta. La combinación aplastada y el rebase quedan desactivados en el repositorio.

**Mientras el equipo sea de una sola persona, no se exigen aprobaciones.** Se suspenden, sin
eliminarse, los dos requisitos de aprobación de las convenciones. Todo lo demás se mantiene, y
lo hace cumplir la regla "Protect main" de GitHub:

- Nadie empuja directamente a `main`. Todo entra por una propuesta de cambio.
- Las cuatro comprobaciones de la integración continua
  ([ADR 0011](0011-integracion-continua-en-github-actions.md)) tienen que estar en verde, con
  la rama al día con `main`.
- `main` no se puede borrar ni reescribir con empuje forzado.

A cambio de la aprobación que falta, la descripción de cada propuesta incluye la revisión que
haría quien aprueba: la lista de la definición de trabajo terminado, marcada punto por punto y
con los puntos que no se cumplen. En los cambios de autenticación, permisos o cálculo de
existencias, además, se pasa la revisión de `.claude/agents/security-auditor.md` y se resume
su resultado en la propuesta.

## Alternativas consideradas

### Combinación aplastada

Lo que pedían las convenciones. A favor: una entrada en `main` por unidad de trabajo. En
contra: se pierde en `main` la historia paso a paso de cada rama, que explica por qué se hizo
cada cambio. Descartada por decisión del propietario del producto. La reversión sigue siendo de
una vez: se revierte la confirmación de combinación.

### Exigir la aprobación y saltarla como administrador

A favor: la regla escrita se cumple en apariencia, y cada salto queda registrado. En contra: se
salta en todas las fusiones, así que el registro no distingue nada y acostumbra a saltarse las
reglas. Descartada.

### Una segunda cuenta para aprobar

A favor: la aprobación existe. En contra: la misma persona aprueba lo que escribió, con otro
nombre. Es una aprobación falsa. Descartada.

### Quitar el requisito de aprobación de las convenciones

A favor: sencillo. En contra: el requisito es correcto en cuanto haya una segunda persona, y
borrarlo obligaría a recordar volver a escribirlo. Descartada en favor de suspenderlo con una
condición de retorno.

## Consecuencias

**Positivas.** `main` conserva cada paso de cada rama. Se puede fusionar sin saltarse ninguna
regla activa, y todo lo que se puede comprobar automáticamente sigue siendo obligatorio.

**Negativas.** Cada confirmación de una rama queda para siempre en `main`, así que una
confirmación mal escrita o que mezcla cambios ya no desaparece al fusionar. Ningún cambio lo
revisa una segunda persona: los errores de diseño o de seguridad que no detectan las pruebas
ni el linter llegan a `main`. La revisión escrita en la propuesta mitiga ese riesgo pero no lo
sustituye, porque quien revisa su propio trabajo tiende a no ver sus errores.

**Neutras.** Las reglas sobre el mensaje de cada confirmación, incluido el idioma, pesan más,
porque todas llegan a `main`.

## Impacto

- Seguridad: los cambios de autenticación, permisos y existencias pierden la segunda
  aprobación de arquitectura. Se compensa en parte con la revisión del agente de seguridad.
- Rendimiento y escalabilidad: ninguno.
- Operación: la regla "Protect main" de GitHub y los ajustes de fusión del repositorio aplican
  esta decisión.
- Coste: ninguno.
- Migración: ninguna. Las fusiones anteriores ya usaron la combinación normal.

## Cumplimiento

- GitHub solo permite la combinación normal y exige las cuatro comprobaciones.
- La regla "Protect main" prohíbe el empuje directo y el forzado.
- Una propuesta sin la lista de verificación marcada no se fusiona.

## Revisión

La parte de las aprobaciones se reconsidera cuando entre al proyecto una segunda persona con
permiso de escritura: se activa en GitHub la aprobación obligatoria y los requisitos de las
convenciones vuelven a regir tal como están escritos. La parte del método de fusión se
reconsidera si el historial de `main` se vuelve difícil de leer o de revertir.

# 0017. La bitácora guarda los cambios de todos los usuarios, no las consultas, y no se purga

**Estado:** aceptada
**Fecha:** 2026-09-28
**Decide:** propietario del producto
**Consultados:** equipo de arquitectura, seguridad
**Relacionadas:** [0005](0005-super-administrador-de-plataforma.md) (enmendada por este),
[0015](0015-auditoria-de-consultas-del-super-administrador.md) (sustituida por este)

## Contexto

La bitácora existe para las auditorías futuras: responder quién cambió un registro, cuándo,
desde dónde y de qué a qué. Hoy ya lo hace para cualquier usuario (RN-070), en la misma
transacción que el cambio, y no se edita ni se borra (RN-071).

El ADR 0005 pedía además auditar las lecturas del super administrador, y el ADR 0015 lo
puso en la puerta de permisos: una entrada por cada pantalla de consulta, escrita antes de
leer. Se llegó a proponer extenderlo a todos los usuarios, y eso dejó ver el coste:

- Las lecturas son la inmensa mayoría de lo que hace la gente. Con todos los usuarios se
  estimaron, sin medir, entre 15 y 25 gigabytes al año, con archivo en frío casi seguro
  durante el primer año.
- Una auditoría pregunta por cambios, no por quién abrió una lista.
- Escribir antes de leer ata cada consulta a la bitácora: si esta falla, nadie consulta.

RN-074, cuánto se conserva la bitácora, seguía pendiente. El propietario del producto no
quiere borrar nada.

## Decisión

**La bitácora guarda las acciones que cambian registros, de cualquier usuario, y se
conserva sin plazo. Las consultas no se registran, tampoco las del super administrador.**

1. **Qué entra.** Toda escritura: altas, ediciones, cambios de estado, eliminaciones,
   accesos y privilegios, de miembros y de super administradores. Además, los sucesos de
   sesión que ya se registran: entrar, salir, cambiar de empresa, cambiar la contraseña,
   el bloqueo por intentos y el segundo factor. La entrada del super administrador sigue
   llevando la empresa afectada y la marca de privilegio elevado (RN-072).
2. **Qué no entra.** Ninguna consulta. El registro de consultas del ADR 0015 se retira.
   Nunca llegó a escribir una entrada: ninguna pantalla lo usaba todavía.
3. **Retención (RN-074): indefinida.** No hay purga, en línea con RN-071.
4. **Revisión por tamaño, no por fecha.** Si `audit_logs` pasa de cinco gigabytes, o su
   pantalla deja de responder dentro del presupuesto de rendimiento, se decide cómo
   archivar en frío, sin borrar. Con solo cambios, se espera que eso tarde años.

## Alternativas consideradas

### Registrar las consultas de todos los usuarios

Responde qué vio cada persona. En contra: el volumen descrito arriba, poco valor para una
auditoría y la operación entera dependiendo de la bitácora. Se descartó.

### Mantener solo las consultas del super administrador

Es la cuenta que ve todas las empresas, y su riesgo principal es mirar lo que no le toca.
Son pocas personas, así que el volumen sería pequeño. En contra: el propietario prefiere
una sola regla para todos, la bitácora de cambios. Se descartó, y el riesgo queda aceptado
abajo.

### Un plazo de retención con purga

La tabla no crecería sin límite. En contra: el propietario no quiere borrar, y un plazo
corto podría quedar por debajo de un mínimo legal. Se descartó.

## Consecuencias

**Positivas.** Una regla simple: lo que cambia queda, para siempre. La bitácora crece al
ritmo de los cambios, no de las lecturas, y ninguna consulta depende de ella. RN-074 deja
de estar pendiente.

**Negativas.** Una consulta indebida del super administrador dentro de una empresa no deja
rastro en la bitácora. Queda registrado que entró a esa empresa, cuándo y por qué
permiso (`auth.company_entered`), pero no lo que miró dentro. Es un riesgo aceptado por el
propietario del producto. Lo mitigan el segundo factor obligatorio, la entrada a cada
empresa registrada y la revisión periódica de quién tiene el privilegio.

**Neutras.** Cada entrada guarda la dirección de red y el navegador, que son datos
personales. Si algún país donde se opere fija un plazo máximo para conservarlos, habrá que
tratar esas dos columnas sin borrar las entradas. Queda como pregunta abierta para
negocio y asesoría legal.

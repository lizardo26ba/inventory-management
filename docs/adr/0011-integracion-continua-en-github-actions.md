# 0011. Integración continua en GitHub Actions, con PostgreSQL en contenedor

**Estado:** aceptada
**Fecha:** 2026-09-20
**Decide:** propietario del producto
**Consultados:** equipo de arquitectura
**Relacionadas:** [0009](0009-pruebas-de-integracion-en-rama-de-neon.md),
[0010](0010-aislamiento-con-seguridad-a-nivel-de-fila.md)

## Contexto

Las reglas de Git exigen la integración continua en verde para fusionar, y el repositorio no
tenía ninguna. Toda la verificación era local, así que nada impedía fusionar un cambio que
solo funcionaba en el equipo de quien lo escribió.

Al montarla aparecieron dos cosas que había que decidir.

**Qué base usa la suite de integración.** El
[ADR 0009](0009-pruebas-de-integracion-en-rama-de-neon.md)
llevó la suite local a una rama de Neon porque el equipo no usa Docker, y anticipó que la
integración continua necesitaría su propia rama. Pero en los ejecutores de GitHub sí hay
Docker.

**Qué se hace con las vulnerabilidades conocidas.** `security-auditor.md` pide dependencias
sin vulnerabilidades altas ni críticas. Hoy hay tres avisos altos: dos en `postcss`, que
viene dentro de `next` 15.5.25, y uno en `deepmerge-ts`, dentro de la herramienta de Prisma.
El primero solo se arregla con Next 16, que es una versión mayor. Ninguno es explotable aquí:
actúan al compilar, sobre archivos del propio proyecto. Pero la regla no distingue, y una
auditoría estricta dejaría la integración continua en rojo desde el primer día.

## Decisión

La integración continua corre en GitHub Actions, con cuatro trabajos que bloquean la fusión:

1. **Formato, linter, tipos y pruebas unitarias.**
2. **Integración**, contra un PostgreSQL 18 en contenedor de servicio que nace y muere con la
   ejecución. La base se llama `inventario_test`, que es lo que exige la guarda, y la suite la
   recrea con todas las migraciones, incluida la prueba de aislamiento entre empresas.
3. **Compilación.**
4. **Secretos y dependencias.** La auditoría falla ante cualquier aviso alto o crítico, salvo
   los anotados en `scripts/ci/audit-exceptions.json`, cada uno con su motivo y una caducidad.

Las excepciones siguen tres reglas, y el guion `scripts/ci/audit-dependencies.ts` las aplica:

- Un aviso alto o crítico sin anotar hace fallar la ejecución.
- Una excepción caducada también: caducar obliga a volver a mirarla.
- Una excepción que ya no corresponde a ningún aviso también, para que la lista no acabe
  justificando lo que ya no existe.

Las tres de hoy caducan el 2026-11-19, a los 60 días. Antes de esa fecha hay que subir a
Next 16 o volver a justificarlas.

En local no cambia nada: la suite sigue corriendo contra la rama de Neon del ADR 0009.

Quedan fuera, y pendientes, dos etapas que pide `qa-test-engineer.md`, sección 7:

- **Pruebas de extremo a extremo.** No hay configuración de Playwright ni pruebas escritas.
- **Presupuesto del paquete de JavaScript.** No está definido.

## Alternativas consideradas

### Una rama de Neon para la integración continua

Lo que anticipaba el ADR 0009. A favor: el mismo motor y proveedor que en desarrollo. En
contra: exige guardar una cadena de conexión como secreto de GitHub, y dos ejecuciones a la
vez compartirían la rama y se pisarían. El contenedor no tiene ninguna de las dos cosas.
Descartada.

### Auditar sin bloquear

Informar de las vulnerabilidades sin hacer fallar la ejecución. A favor: nada se queda en
rojo. En contra: un aviso que no bloquea es un aviso que nadie lee, y dejaría pasar también
los nuevos. Descartada.

### Bloquear ya, sin excepciones

Cumple la regla al pie de la letra. En contra: no se podría fusionar nada hasta subir a
Next 16, que es trabajo grande y con riesgo propio. Descartada en favor de excepciones con
fecha.

### Una herramienta de auditoría con lista de permitidos

Existen paquetes que hacen esto. En contra: son una dependencia nueva, con su ADR, para algo
que resuelve un guion de cien líneas sobre `npm audit --json`. Descartada.

## Consecuencias

**Positivas.** Ningún cambio llega a `main` sin pasar tipos, pruebas, compilación y
auditoría en una máquina limpia. La suite de integración, con la prueba de aislamiento, corre
en cada propuesta de cambio. Las vulnerabilidades conocidas quedan escritas, justificadas y
con fecha, en lugar de ignoradas.

**Negativas.** En la integración continua la suite corre contra PostgreSQL de serie, no
contra Neon: una diferencia de comportamiento propia de Neon no se vería allí. Hay dos
entornos de integración distintos que mantener. Las excepciones exigen revisión periódica, y
si nadie la hace la ejecución se pone en rojo por caducidad.

**Neutras.** Aparece `npm run audit:deps` y la carpeta `.github/workflows`.

## Impacto

- Seguridad: ningún secreto en la canalización. La base del contenedor no tiene contraseña
  porque solo existe dentro de la ejecución, y la clave de sesión se genera y se enmascara en
  cada una.
- Rendimiento y escalabilidad: cada ejecución tarda unos minutos, en cuatro trabajos que
  corren en paralelo.
- Operación: para que la integración continua bloquee de verdad, la rama `main` necesita en
  GitHub una regla que exija estos cuatro trabajos. Eso se configura en el repositorio, no
  aquí.
- Coste: dentro de los minutos gratuitos de GitHub Actions para un repositorio de este
  tamaño.
- Migración: ninguna.

## Cumplimiento

- La regla de protección de `main` en GitHub exige los cuatro trabajos en verde.
- El guion de auditoría es el que decide, y sus tres condiciones de fallo están arriba.
- En revisión de código, una excepción nueva sin motivo o sin caducidad se rechaza.

## Revisión

Se reconsidera al subir a Next 16, que debería vaciar la lista de excepciones; al escribir
las primeras pruebas de extremo a extremo, que añaden su trabajo; o si una diferencia entre
PostgreSQL y Neon llega a producción sin que la integración continua la viera.

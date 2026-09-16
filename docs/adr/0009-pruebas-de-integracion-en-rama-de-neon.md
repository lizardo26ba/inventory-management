# 0009. Correr las pruebas de integración contra una rama de Neon dedicada

**Estado:** aceptada
**Fecha:** 2026-09-15
**Decide:** propietario del producto
**Consultados:** equipo de arquitectura
**Relacionadas:** [0001](0001-stack-tecnologico.md), [0002](0002-existencias-como-libro-de-movimientos.md)

## Contexto

Las reglas de arquitectura ponían Testcontainers en el stack de pruebas, y
`qa-test-engineer.md` exigía correr la integración contra un PostgreSQL en contenedor.
Testcontainers necesita Docker, y el equipo de desarrollo no usa Docker. La
[evaluación de NoSQL](../architecture/evaluacion-nosql.md) ya registró que Docker no
funcionaba sin virtualización en ese equipo.

Hasta ahora no existía ninguna prueba de integración, así que la regla nunca se había
puesto a prueba. La primera pantalla que lee la bitácora de auditoría necesita una: su
consulta pagina por cursor y filtra con índices, y eso solo se comprueba contra un
PostgreSQL real.

Tres hechos condicionan cómo se prepara esa base:

- La base de desarrollo vive en Neon, con ramas por cambio de esquema según
  `database-architect.md`, sección 7.2.
- La tabla `audit_logs` rechaza `UPDATE`, `DELETE` y `TRUNCATE` por disparador (RN-071).
  Una base de pruebas no se puede vaciar tabla a tabla: hay que recrearla.
- La suite borra todo lo que encuentra. Apuntarla por error a la base de desarrollo o a
  `main` destruiría datos, y nada en una cadena de conexión dice de qué rama es.

## Decisión

La suite de integración corre contra una rama de Neon dedicada solo a pruebas, con una
base cuyo nombre termina en `_test`. Su cadena de conexión va en `TEST_DATABASE_URL`.

Alcance exacto:

1. Antes de cada ejecución, la preparación global recrea la base con
   `prisma migrate reset`, que la borra y aplica todas las migraciones desde cero. Cada
   ejecución parte del mismo estado y comprueba de paso que las migraciones se aplican en
   orden sobre una base vacía.
2. Una guarda se niega a correr si falta la variable, si la base no termina en `_test`, o
   si apunta al mismo destino que `DATABASE_URL` o `DIRECT_DATABASE_URL`. El agrupador y
   el host directo de Neon cuentan como el mismo destino.
3. Cada archivo de prueba sustituye `DATABASE_URL` por la base ya comprobada antes de
   importar la aplicación. El código de la aplicación no sabe que está en una prueba.
4. Como la bitácora no se puede vaciar, cada prueba crea sus propios datos con
   identificadores únicos y consulta filtrando por ellos. Ninguna prueba depende de que
   la base esté vacía.
5. La preparación de la suite corre fuera de la aplicación, como la semilla, y lee el
   entorno directamente. La regla de leer `process.env` solo desde `src/lib/config`
   sigue valiendo para todo `src/`.
6. En el proyecto de integración, `server-only` se sustituye por un módulo vacío. La
   aplicación sigue usando el paquete real.

Queda fuera: las pruebas de extremo a extremo, que siguen con Playwright, y la
integración continua, que todavía no existe. Cuando exista necesitará su propia rama.

## Alternativas consideradas

### Testcontainers

La que fijaban las reglas. A favor: una base efímera por ejecución, sin estado compartido
ni red. En contra: exige Docker en marcha, y el equipo no lo usa. Descartada porque no se
puede ejecutar en el entorno real de desarrollo.

### PostgreSQL nativo en el equipo de desarrollo

Hay un PostgreSQL 18 instalado con una base `inventario_test`. A favor: rápido y sin red.
En contra: cada equipo mantiene su propia instalación y su propia versión, que puede
separarse de la de Neon sin que nadie lo note. Descartada por el propietario del producto
en favor de la misma plataforma donde vive la base de desarrollo.

### Reutilizar la rama de desarrollo

A favor: no hay nada que crear. En contra: la suite recrea la base entera, así que
borraría los datos de desarrollo en cada ejecución. Descartada.

### Solo pruebas unitarias

A favor: no hace falta ninguna base. En contra: la Definition of Done exige prueba de
integración cuando un cambio toca la base, y ni la paginación por cursor ni el disparador
de la bitácora se pueden comprobar sin un PostgreSQL real. Descartada.

## Consecuencias

**Positivas.** Las pruebas de integración existen y corren en el entorno real del equipo.
Prueban contra el mismo motor y proveedor que desarrollo. Las migraciones se aplican desde
cero en cada ejecución, que es lo que pide la sección 7 de `qa-test-engineer.md`.

**Negativas.** La suite necesita conexión a internet y es más lenta que una base local,
por la latencia de red y por recrear la base al empezar. Una rama compartida entre dos
personas que ejecuten la suite a la vez produce fallos cruzados, así que cada persona
necesita su propia rama. La capa gratuita de Neon limita el número de ramas. La guarda
protege por nombre de base y por destino, pero no puede saber qué rama es `main` si
nadie la tiene configurada.

**Neutras.** Aparece una variable más que cada persona configura, y una rama más en Neon.

## Impacto

- Seguridad: `TEST_DATABASE_URL` es un secreto, igual que las demás cadenas de conexión.
  La guarda impide el error más caro, que es vaciar una base con datos.
- Rendimiento y escalabilidad: la suite tarda más. Si una ejecución supera los cinco
  minutos, se revisa esta decisión.
- Operación: la persona crea la rama de pruebas en la consola de Neon y pone su cadena en
  `.env`. La integración continua, cuando exista, necesitará una rama propia.
- Coste: una rama más por persona dentro de la capa gratuita de Neon.
- Migración: se actualizan `CLAUDE.md`, `qa-test-engineer.md`, `.env.example` y la
  configuración de Vitest. No hay pruebas de integración anteriores que adaptar.

## Cumplimiento

- La guarda es una función pura con pruebas unitarias en `tests/unit`. Se ejecuta antes de
  recrear la base y otra vez en cada archivo de prueba.
- Si falta `TEST_DATABASE_URL`, la suite se detiene con un mensaje que nombra la variable
  y enlaza este registro. No pasa en silencio.
- En revisión de código se rechaza cualquier prueba de integración que vacíe tablas o que
  dependa de que la base esté vacía.

## Revisión

Se reconsidera si el equipo pasa a tener Docker disponible, si la suite supera los cinco
minutos, o cuando se monte la integración continua y haya que decidir cómo obtiene su base.

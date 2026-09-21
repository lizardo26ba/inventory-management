# 0010. Aislar las organizaciones con seguridad a nivel de fila y un rol de aplicación

**Estado:** aceptada
**Fecha:** 2026-09-16
**Decide:** propietario del producto
**Consultados:** equipo de arquitectura
**Relacionadas:** [0003](0003-multiempresa-con-identificador-de-organizacion.md),
[0005](0005-super-administrador-de-plataforma.md)

## Contexto

El [ADR 0003](0003-multiempresa-con-identificador-de-organizacion.md) decidió la segunda
barrera de aislamiento: seguridad a nivel de fila en PostgreSQL, para que un olvido de filtro
en el código no baste para exponer los datos de otra empresa. Nunca se implementó. Hoy el
aislamiento depende de una sola cosa: que cada consulta del repositorio recuerde filtrar.

Al ir a implementarlo aparecieron tres hechos que deciden el cómo.

**El rol actual se salta la seguridad.** La aplicación se conecta como `inventory_owner`, que
tiene `rolbypassrls` y pertenece a `neon_superuser`, que también lo tiene. Además es el dueño
de las 38 tablas. Con ese rol, una política se escribe pero no se aplica nunca, ni siquiera
forzándola con `FORCE ROW LEVEL SECURITY`: el privilegio de saltarla manda por encima.

**La organización no llega a la base.** Las políticas necesitan saber en qué empresa actúa la
sesión. PostgreSQL no lo sabe: hay que decírselo en cada transacción.

**Hoy todas las pantallas son de plataforma.** Empresas, usuarios y bitácora se consultan por
encima de todas las organizaciones, con permisos de plataforma. Es decir: la barrera nueva
protegerá sobre todo al código de empresa que todavía no existe, que es exactamente cuando
conviene ponerla, porque después habría que revisar cada consulta ya escrita.

## Decisión

Se activa seguridad a nivel de fila en toda tabla de negocio, con cuatro piezas.

**Uno. Un rol de aplicación sin privilegio de salto.** Se crea `inventory_app` por SQL, con
`NOBYPASSRLS` y solo `SELECT`, `INSERT`, `UPDATE` y `DELETE` sobre las tablas. No se crea desde
la consola de Neon: los roles creados ahí heredan `neon_superuser`, que salta la seguridad.
`DATABASE_URL` pasa a usarlo. `DIRECT_DATABASE_URL` sigue con el dueño, porque las migraciones
necesitan alterar la estructura.

**Dos. La organización viaja en la transacción.** Toda operación se abre con un ayudante único
en `src/lib/db` que fija `app.organization_id` con `set_config(..., true)`, es decir válido
solo dentro de esa transacción. Como consecuencia, **toda consulta corre dentro de una
transacción**, también las lecturas. Con el agrupador de conexiones en modo transacción, ese
valor no puede filtrarse a la petición siguiente.

**Tres. La excepción del super administrador es explícita.** Cuando la sesión es de un super
administrador, el mismo ayudante fija además `app.platform_admin`. Las políticas la aceptan.
Es la excepción que el [ADR 0005](0005-super-administrador-de-plataforma.md) exige que sea
explícita y auditada, y se enciende en un solo sitio del código.

**Cuatro. Las tablas puente miran a su padre.** `role_permissions`, `membership_roles`,
`warehouse_access` y `stock_movement_serials` no tienen `organization_id`. Su política
comprueba con `EXISTS` que la fila padre pertenece a la organización de la sesión. Cuesta una
comprobación más y evita una migración de datos sobre tablas que ya tienen filas.

Queda fuera: las tablas sin organización, que son identidad (`users`, `sessions`,
`password_reset_tokens`, `platform_admins`), los catálogos globales (`countries`,
`currencies`, `exchange_rates`, `permissions`) y las de infraestructura. Su acceso lo decide
el permiso, no la pertenencia a una empresa.

## Alternativas consideradas

### Seguir con el rol dueño y forzar las políticas

A favor: no hay que crear ningún rol, ni cambiar cadenas de conexión, ni gestionar otra
contraseña. En contra: no funciona. `FORCE ROW LEVEL SECURITY` quita la exención del dueño,
pero no la de `BYPASSRLS`, que este rol tiene por pertenecer a `neon_superuser`. Escribiría
políticas que nunca se aplican, que es peor que no tenerlas: dan una seguridad falsa.
Descartada.

### Dejar el aislamiento solo en la capa de aplicación

Es lo que hay hoy. A favor: cero trabajo y cero latencia añadida. En contra: un `where` que
falte en una consulta nueva es una fuga entre clientes, que es el fallo más grave del
producto. El ADR 0003 ya lo descartó; esto solo lo cumple.

### Una base de datos por organización

Aislamiento máximo, sin políticas. Ya se descartó en el ADR 0003 por coste operativo, y nada
ha cambiado desde entonces.

### Añadir `organization_id` a las tablas puente

Daría políticas directas y algo más rápidas, y sería coherente con el resto del esquema. En
contra: exige una migración en tres fases sobre tablas con datos para rellenar la columna.
Se prefiere la comprobación por el padre, y se reconsiderará si alguna de esas tablas aparece
en una consulta caliente.

## Consecuencias

**Positivas.** Un olvido de filtro deja de ser una fuga: la base devuelve cero filas. El
aislamiento pasa a depender de dos cosas independientes, y las dos tendrían que fallar a la
vez. La excepción de plataforma queda en un único punto, visible y auditable.

**Negativas.** Toda lectura pasa a correr dentro de una transacción, lo que añade un viaje a
la base por operación. Aparece una contraseña más que rotar y custodiar. Las políticas son
código que se prueba: sin pruebas de aislamiento que corran con el rol de aplicación, nadie
sabría que dejaron de aplicarse. Depurar se vuelve más confuso, porque una consulta correcta
puede devolver cero filas por culpa del contexto y no del filtro.

**Neutras.** El repositorio deja de hablar con Prisma directamente y pasa a hacerlo dentro
del ayudante. Las migraciones siguen corriendo con el dueño, sin cambio.

## Impacto

- Seguridad: es el objetivo. Aparece un secreto nuevo, la contraseña del rol de aplicación,
  con las mismas reglas que los demás: fuera del repositorio y rotable.
- Rendimiento: un viaje más por operación para fijar el contexto. Se mide antes y después en
  el listado de la bitácora, que es la consulta más cara que existe hoy.
- Operación: cada entorno necesita el rol creado y sus concesiones aplicadas. El guion es
  idempotente y se vuelve a ejecutar tras recrear un esquema, porque las concesiones se
  pierden con él.
- Coste: ninguno.
- Migración: se activa tabla por tabla en una sola migración. No hay datos que mover.

## Cumplimiento

- Pruebas de integración que, **conectadas con el rol de aplicación**, comprueban que una
  sesión de una empresa no alcanza filas de otra, ni leyéndolas, ni editándolas, ni
  borrándolas, en cada tabla de negocio.
- Una prueba que verifica que el rol de aplicación no tiene `rolbypassrls`. Si alguien lo
  concede, la barrera desaparece en silencio, y esa prueba es lo único que lo delataría.
- Prueba de que sin contexto de organización una consulta devuelve cero filas, en lugar de
  devolverlo todo.
- Revisión de código: una consulta que no pase por el ayudante de transacción se rechaza.

## Revisión

Se reconsidera si la latencia añadida supera el presupuesto de las operaciones de escritura,
o si aparece una tabla puente en una consulta caliente, en cuyo caso esa tabla recibirá su
propia columna de organización.

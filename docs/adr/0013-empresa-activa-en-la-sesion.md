# 0013. La empresa activa en la sesión, y lo que la base ve antes y después de elegirla

**Estado:** aceptada
**Fecha:** 2026-09-27
**Decide:** propietario del producto
**Consultados:** equipo de arquitectura
**Relacionadas:** [0005](0005-super-administrador-de-plataforma.md),
[0007](0007-sesion-propia-sin-libreria-de-autenticacion.md),
[0010](0010-aislamiento-con-seguridad-a-nivel-de-fila.md)

## Contexto

Toda sesión se abre sin empresa activa, y ningún camino del sistema le asigna una. La
aplicación solo tiene pantallas de plataforma. Nada de la operación, que son productos,
almacenes, existencias, compras y ventas, puede existir antes de resolver esto, porque con
la seguridad a nivel de fila una consulta sin empresa declarada devuelve cero filas.

Al diseñarlo aparecieron tres problemas.

**El alcance de datos no distinguía plataforma de empresa.** El ayudante que traduce la
sesión al contexto de la base encendía la excepción de plataforma siempre que la sesión era
de un super administrador. Dentro de una empresa, eso le habría dejado ver las filas de
todas las empresas desde cualquier pantalla de operación, y la única barrera habría vuelto
a ser que cada consulta recordara filtrar.

**Hay que leer datos de empresa antes de tener empresa.** Para ofrecer "elige en qué
empresa trabajar" hay que leer las membresías de la persona y los nombres de sus empresas.
Y para cumplir RN-006, que exige cortar el acceso en el acto al retirar una membresía, cada
petición con empresa activa tiene que comprobar que la membresía sigue viva. Las dos cosas
ocurren sin empresa declarada, y las políticas del ADR 0010 las responden con cero filas.

**Tres preguntas de producto sin respuesta:** qué pasa con quien pertenece a una sola
empresa, con qué permisos entra un super administrador que además es miembro de la
empresa, y qué pasa con el segundo factor de los administradores de empresa, que RN-005
exige y cuyas pantallas no existen.

## Decisión

**Uno. Dos alcances con nombre, y la persona solo sin empresa.** El contexto de la base
gana un tercer valor, `app.user_id`, y los alcances pasan a ser tres, cada uno con su
función:

| Alcance           | Empresa   | Persona | Excepción de plataforma    | Para qué                                |
| ----------------- | --------- | ------- | -------------------------- | --------------------------------------- |
| `platformScopeOf` | ninguna   | no      | la del super administrador | Pantallas que miran todas las empresas  |
| `companyScopeOf`  | la activa | no      | **apagada, siempre**       | Toda la operación                       |
| `personalScope`   | ninguna   | sí      | apagada                    | Elegir empresa y comprobar la membresía |

Un super administrador dentro de una empresa trabaja con `companyScopeOf`: la base le
enseña esa empresa y ninguna otra, igual que a un miembro. Su acceso elevado se nota en la
autorización, que le concede cualquier permiso de empresa (ADR 0005), y en la bitácora,
que lo registra como plataforma (RN-072). No se nota en qué filas alcanza.

La persona no va en el alcance de empresa. Con ella, la base añadiría a la empresa activa
lo que la persona tiene en las demás.

**Dos. La persona ve lo suyo, solo para leer.** Cuatro políticas de consulta, que se suman
a las del ADR 0010:

- `memberships`: sus membresías activas y no revocadas.
- `organizations`: las empresas de esas membresías.
- `membership_roles` y `roles`: sus roles en ellas.

Son `FOR SELECT`, así que no amplían la escritura: para crear, cambiar o borrar sigue
haciendo falta la empresa en el contexto. Una membresía revocada deja de dar acceso y
también deja de enseñar el nombre de su empresa.

**Tres. Las decisiones de producto:**

- **Quien pertenece a una sola empresa entra directo en ella.** El selector solo aparece
  con dos o más.
- **Un super administrador entra siempre como plataforma**, aunque además sea miembro de
  la empresa: acceso elevado, distintivo permanente y auditoría elevada. Así lo que se
  registra no depende de si alguna vez le dieron un rol en esa empresa.
- **El segundo factor de los administradores de empresa sigue la misma suspensión** que
  el del super administrador en la enmienda del ADR 0005. Lo decide la misma variable,
  `PLATFORM_ADMIN_TWO_FACTOR`, y se retira con las mismas pantallas. Si no, ningún
  administrador de empresa podría entrar.

Quedan para los cambios siguientes, con sus propias pruebas: elegir empresa y entrar como
plataforma, que rotan la sesión (ADR 0007) y se auditan (ADR 0005); la comprobación de la
membresía en cada petición; y la auditoría de lecturas que pide el ADR 0005.

## Alternativas consideradas

### Una función con privilegios de dueño que devuelva las membresías

Una función `SECURITY DEFINER` que lea las membresías saltándose las políticas. A favor:
no toca las políticas. En contra: es una puerta que salta la seguridad a nivel de fila
escrita en código, más difícil de revisar que una política declarada, y cualquier error
en ella expone las membresías de todos. Descartada.

### Mantener un solo alcance y filtrar en la aplicación

Dejar la excepción encendida para el super administrador dentro de la empresa y confiar en
que cada consulta filtre por la empresa activa. A favor: no cambia nada. En contra: es
exactamente la situación que el ADR 0010 quiso dejar atrás. Descartada.

### Llevar la persona también en el alcance de empresa

Más simple: un solo valor más, siempre puesto. En contra: dentro de la empresa B, la base
enseñaría además la membresía y la empresa A de la persona. Son datos suyos, pero una
pantalla de empresa sin filtro los mostraría como si fueran de B. Descartada al escribir la
prueba de aislamiento.

### Que el super administrador elija cada vez con qué papel entra

A favor: flexible. En contra: dos formas de entrar a lo mismo, más difíciles de usar, de
probar y de auditar. Descartada por el propietario del producto.

## Consecuencias

**Positivas.** La operación puede empezar a construirse. Dentro de una empresa, la base
defiende el aislamiento también frente al super administrador. RN-006 se puede cumplir
leyendo la membresía en cada petición, sin atajos.

**Negativas.** La seguridad a nivel de fila gana cuatro políticas y una tercera variable de
contexto, y con ellas más superficie que revisar. Las lecturas de `memberships`,
`organizations`, `roles` y `membership_roles` evalúan una condición más. Las subconsultas
van por índices existentes: la clave única de `memberships` sobre persona y empresa, y la
clave primaria y el índice por rol de `membership_roles`. No se midió su efecto.

**Neutras.** `scopeOf` pasa a llamarse `platformScopeOf`, que es lo que siempre hizo.

## Impacto

- Seguridad: la excepción de plataforma deja de estar disponible en la operación. La
  persona puede leer sus propias membresías sin empresa, y nada más.
- Rendimiento: una condición más en cuatro tablas, sobre índices existentes.
- Operación: la migración `20260927180000_contexto_de_usuario_en_seguridad_por_fila`, que
  es aditiva. Deshacerla es una migración nueva con los `DROP` que lista su cabecera.
- Coste: ninguno.
- Migración: ninguna sobre datos.

## Cumplimiento

- La prueba de aislamiento, conectada con un rol sin `BYPASSRLS`, fija lo que la persona
  ve y lo que no, y que leer lo propio no permite escribir.
- Las pruebas unitarias de los alcances fijan que `companyScopeOf` apaga la excepción y no
  lleva a la persona, también para un super administrador.
- En revisión, una pantalla de operación que use `platformScopeOf` se rechaza.

## Revisión

Se reconsidera si aparece una pantalla de operación que necesite ver más de una empresa a
la vez, o si llega el segundo factor, que retira la suspensión de la tercera decisión.

La redacción de `.claude/agents/database-architect.md`, sección 2.1, dice que la excepción
de plataforma se activa "solo cuando la sesión es de un super administrador con
organización elegida". Desde el ADR 0010 las pantallas de plataforma la usan sin empresa
elegida, y desde este registro la operación dentro de una empresa no la usa. Conviene
alinear esa sección con esta tabla.

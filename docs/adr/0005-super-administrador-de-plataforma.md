# 0005. Super administrador de plataforma con acceso transversal auditado

**Estado:** aceptada
**Fecha:** 2026-09-10
**Decide:** equipo de arquitectura
**Relacionadas:** [0003](0003-multiempresa-con-identificador-de-organizacion.md), [0004](0004-autenticacion-con-credenciales-propias.md)

## Contexto

El producto es multiempresa. Quien lo opera necesita poder dar de alta organizaciones,
diagnosticar incidencias dentro de una empresa cliente y corregir datos cuando el soporte
lo requiere. Sin ese rol, cada incidencia exigiría credenciales prestadas del cliente, que
es la peor alternativa posible desde el punto de vista de trazabilidad.

La tensión es evidente. El sistema se construyó sobre denegar por defecto y sobre
aislamiento estricto entre organizaciones. Un rol sin restricciones contradice ambos
principios y concentra en una sola cuenta el acceso a todos los datos de todos los
clientes.

## Decisión

Existe un super administrador de plataforma con alcance transversal, sujeto a cuatro
controles que no son negociables.

**Uno. El privilegio es un hecho registrado, no una bandera.** Se modela en la tabla
`platform_admins`, con quién lo concedió, cuándo y por qué motivo. La revocación se marca
con fecha en lugar de borrar la fila, de modo que el historial de quién tuvo acceso
sobreviva.

**Dos. No hay acceso ambiente.** Un super administrador no ve datos de ninguna
organización hasta que elige una de forma explícita. Esa elección rota la sesión, marca
`acting_as_platform_admin` y genera una entrada de auditoría. Mientras dura, la interfaz
muestra un distintivo permanente que indica en qué organización está actuando con
privilegio elevado.

**Tres. Segundo factor obligatorio.** La cuenta no puede existir sin segundo factor
activo, y la sesión debe haberlo superado antes de poder elegir organización.

**Cuatro. Toda acción se audita con contexto elevado.** Cada entrada registra la
organización afectada y el hecho de que se ejecutó como plataforma. Las lecturas de datos
de cliente también se auditan, no solo las escrituras, porque el riesgo principal es la
consulta indebida.

El permiso se resuelve así: cuando la sesión pertenece a un super administrador activo con
organización elegida, la verificación de permisos concede cualquier permiso de alcance de
organización. La verificación **sigue ocurriendo**, en el mismo punto único del código, y
sigue registrando qué permiso se ejercía. No se saltan capas ni se añaden atajos
repartidos por el código.

Los permisos de alcance de plataforma, como crear una organización o conceder este mismo
privilegio, jamás pueden asignarse a un rol de organización.

## Alternativas consideradas

**Bandera booleana en el usuario con cortocircuito temprano.** La opción obvia y la más
rápida. En contra, no registra quién concedió el acceso, invita a repartir comprobaciones
del tipo "si es super admin, continúa" por todo el código, y cada una de esas
comprobaciones es un punto donde el aislamiento puede romperse por descuido. Descartada.

**Sin super administrador, con acceso solo mediante consultas directas a la base.** Aisla
mejor en apariencia. En contra, el acceso ocurre igual pero fuera de la aplicación, sin
auditoría, sin permisos y con una credencial de base de datos de alto privilegio circulando.
Descartada por empeorar exactamente lo que pretende proteger.

**Suplantación de un usuario del cliente.** El super administrador asume la identidad de un
usuario de la organización. A favor, ve exactamente lo que ve el cliente. En contra,
confunde la autoría en la auditoría y puede dejar acciones atribuidas a una persona que no
las hizo. Se descarta para la primera versión y podrá revisarse como modo explícito y
etiquetado.

## Consecuencias

**Positivas.** Soporte y operación posibles sin credenciales prestadas. Rastro completo de
quién entró a qué empresa y por qué. La revisión periódica de accesos tiene una fuente
clara de datos.

**Negativas.** Se acepta que existe una cuenta cuyo compromiso expone a todos los clientes.
Se mitiga con segundo factor obligatorio, con auditoría de lecturas y con revisión
trimestral de la lista, pero el riesgo no desaparece. La auditoría de lecturas aumenta el
volumen de escritura de la bitácora y obliga a una política de retención. El aislamiento a
nivel de fila necesita una excepción explícita, que es en sí misma una superficie a
proteger.

**Neutras.** El catálogo de permisos gana una dimensión de alcance.

## Impacto

- Seguridad: aparece la cuenta de mayor valor del sistema. Entra en el modelo de amenazas
  como activo prioritario.
- Rendimiento: la verificación de permisos añade una lectura, resuelta con caché de vida
  corta en la sesión.
- Operación: se necesita alerta cuando un super administrador entra a una organización,
  y revisión trimestral de la lista de cuentas con el privilegio.

## Cumplimiento

- Prueba que verifica que un super administrador sin organización elegida no obtiene
  ningún dato de negocio.
- Prueba que verifica que un permiso de alcance de plataforma no puede asignarse a un rol.
- Prueba que verifica que toda acción con contexto elevado deja entrada de auditoría con
  la organización afectada.
- Prueba que verifica que la cuenta sin segundo factor no puede elegir organización.
- Regla de revisión: cualquier comprobación de super administrador fuera del punto único
  de autorización se rechaza en revisión de código.

## Revisión

Se reconsidera si el número de cuentas con el privilegio supera un puñado, en cuyo caso
convendrá dividirlo en roles de plataforma más finos, por ejemplo soporte de solo lectura
frente a administración plena.

## Enmienda 2026-09-11: el segundo factor se puede saltar por configuración

**Estado:** vigente, temporal
**Decide:** propietario del producto

### Qué cambia

La decisión original exigía el segundo factor siempre en producción, sin posibilidad de
apagarlo. A partir de ahora manda la variable `PLATFORM_ADMIN_TWO_FACTOR` en todos los
entornos, con `required` por omisión. Con el valor `skipped`, la puerta del super
administrador comprueba el privilegio pero no el segundo factor.

### Por qué

Las pantallas de alta y de verificación del segundo factor no existen todavía, y ningún
camino del sistema escribe la marca de segundo factor superado en la sesión. En producción
eso dejaba la puerta cerrada sin llave posible: la cuenta entraba, y cualquier pantalla de
plataforma respondía con un error. El despliegue quedaba inservible, no protegido.

Entre las dos salidas, apagar el control de forma declarada y visible es preferible a que
el despliegue entero no funcione, porque un sistema que no arranca se acaba desplegando con
parches peores y sin registro de lo que se tocó.

### Lo que no cambia

- El privilegio sigue siendo una concesión viva en `platform_admins`, y sin ella no se
  alcanza ninguna pantalla de plataforma.
- La comprobación sigue estando en un punto único de autorización del servidor.
- La auditoría del acceso elevado sigue siendo obligatoria.
- El valor por omisión sigue siendo el seguro, en todos los entornos.

### Riesgo aceptado

Una sesión robada de super administrador basta para el acceso transversal, sin un segundo
obstáculo. Lo compensan, mientras dure: la vida corta de la sesión, el bloqueo por intentos
fallidos, la auditoría de cada entrada a una empresa y el aviso que el arranque escribe en
el registro allí donde el control está apagado.

### Cuándo se retira

Con las pantallas de alta y de verificación del segundo factor. En ese momento la variable
desaparece del código y de la configuración, y esta enmienda pasa a obsoleta. Hasta
entonces, el despliegue que la use lo declara por escrito en su configuración.

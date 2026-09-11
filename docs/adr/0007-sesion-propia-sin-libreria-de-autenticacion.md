# 0007. Sesión propia en base de datos, sin librería de autenticación

**Estado:** aceptada
**Fecha:** 2026-09-10
**Decide:** equipo de arquitectura
**Sustituye a:** [0004](0004-autenticacion-con-credenciales-propias.md)
**Relacionadas:** [0003](0003-multiempresa-con-identificador-de-organizacion.md), [0005](0005-super-administrador-de-plataforma.md)

## Contexto

El registro 0004 fijó autenticación con credenciales propias mediante Auth.js con sesión
persistida en base de datos. Al ir a implementarlo aparecieron dos hechos que invalidan esa
elección.

El primero es que la versión de Auth.js compatible con el enrutador actual de Next.js sigue
en fase beta, y el equipo estableció que no se adoptan dependencias en beta para una pieza
de esta criticidad.

El segundo es determinante. En la versión estable anterior, el proveedor de credenciales
**solo admite sesiones en token firmado**, no sesiones en base de datos. Eso choca con tres
cosas ya decididas:

- La revocación inmediata desaparece. Suspender a un usuario o retirarle un permiso no
  surte efecto hasta que su token expira.
- El cambio de organización del super administrador no puede rotar la sesión ni marcarla
  como privilegio elevado, porque el estado vive en el cliente. El registro 0005 depende de
  eso.
- Las tablas de sesión ya diseñadas, con la marca de segundo factor verificado, quedarían
  sin uso.

En un producto donde una sola cuenta puede alcanzar los datos de todas las empresas, no
poder revocar al instante es un riesgo concreto.

## Decisión

La autenticación se implementa en el propio proyecto, sin librería de autenticación.

- Credenciales de correo y contraseña, con Argon2id.
- Sesión persistida en la tabla `sessions`. La cookie transporta únicamente un
  identificador aleatorio de suficiente entropía; en la tabla se guarda su hash, de modo
  que un volcado de la base no permita suplantar sesiones.
- Cookie con las marcas de solo servidor y transporte seguro, política de mismo sitio en
  modo laxo, y caducidad absoluta además de la de inactividad.
- Rotación del identificador de sesión al iniciar sesión, al superar el segundo factor y al
  cambiar de organización activa.
- Revocación inmediata: cerrar sesión, suspender al usuario o retirar una membresía borra o
  invalida las filas correspondientes y surte efecto en la petición siguiente.
- Segundo factor por códigos temporales, obligatorio para administración de organización y
  para todo super administrador.
- Límite de intentos con retardo progresivo y respuesta indistinguible entre usuario
  inexistente y contraseña incorrecta.
- Recuperación de contraseña con enlace de un solo uso y vida corta, que invalida todas las
  sesiones activas al completarse.
- La verificación de sesión vive en un único módulo. Ninguna ruta la implementa por su
  cuenta.

Se mantienen sin cambio todas las demás disposiciones del registro 0004.

## Alternativas consideradas

**Auth.js versión 5.** Resuelve el problema técnico y trae proveedores federados listos.
Descartada por estar en beta, según criterio explícito del equipo para esta pieza.

**NextAuth versión 4 aceptando el token firmado.** Estable y probada. Se descarta porque
obligaría a compensar la ausencia de revocación acortando la vida del token a pocos
minutos, lo que castiga la experiencia de uso y aun así deja una ventana abierta. Además
dejaría inservible el diseño del super administrador.

**Better Auth versión 1.** Estable, con sesiones en base de datos y soporte del enrutador
actual. Es una candidata razonable. Se descarta por ahora porque introduce una dependencia
externa en la pieza más sensible del sistema, cuando el alcance que necesitamos, correo,
contraseña, segundo factor y sesión en base de datos, es acotado y bien conocido. Queda
como primera opción si más adelante hacen falta proveedores federados.

## Consecuencias

**Positivas.** Revocación inmediata real. El diseño del super administrador funciona como
se especificó. Cero dependencias en beta en la ruta de autenticación. Control total sobre
el ciclo de vida de la sesión.

**Negativas.** El equipo asume código de seguridad propio, que es exactamente el tipo de
código donde un error se paga caro. Se acepta a cambio de mantener el alcance mínimo y de
no inventar criptografía: se usan primitivas conocidas y bibliotecas establecidas para el
hash de contraseña y para los códigos temporales. Añadir un proveedor federado en el futuro
costará más que si hubiéramos partido de una librería. Cada petición hace una lectura de
sesión, mitigable con caché de vida corta.

**Neutras.** El modelo de datos no cambia: las tablas ya estaban diseñadas para esto.

## Impacto

- Seguridad: la ruta de autenticación pasa a ser código propio y entra como área de
  revisión obligatoria en cada cambio.
- Rendimiento: una lectura por petición, con caché de pocos segundos.
- Operación: sin cambios respecto al registro 0004.

## Cumplimiento

- Prueba que verifica que suspender a un usuario invalida sus sesiones en la petición
  siguiente.
- Prueba que verifica que la cookie no contiene el identificador de sesión en claro tal
  como se almacena.
- Prueba que verifica la rotación del identificador al iniciar sesión, al superar el
  segundo factor y al cambiar de organización.
- Prueba que verifica que ninguna ruta comprueba la sesión por su cuenta, fuera del módulo
  único.
- Revisión de seguridad obligatoria en todo cambio que toque este módulo.

## Revisión

Se reconsidera si aparece la necesidad de proveedores federados o de inicio de sesión
único, en cuyo caso Better Auth es la primera candidata a evaluar.

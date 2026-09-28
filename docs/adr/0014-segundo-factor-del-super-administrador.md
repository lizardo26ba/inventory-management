# 0014. Segundo factor del super administrador con app autenticadora, sin códigos de respaldo

**Estado:** aceptada
**Fecha:** 2026-09-27
**Decide:** propietario del producto
**Consultados:** equipo de arquitectura, seguridad
**Relacionadas:** [0005](0005-super-administrador-de-plataforma.md),
[0007](0007-sesion-propia-sin-libreria-de-autenticacion.md),
[0013](0013-empresa-activa-en-la-sesion.md)

## Contexto

El ADR 0005 exige segundo factor al super administrador, y RN-005 lo extendía a los
administradores de empresa. Ninguna de las dos cosas funciona hoy: no existen las pantallas
de alta ni de verificación, y la enmienda del ADR 0005 permite saltarlo con la variable
`PLATFORM_ADMIN_TWO_FACTOR`. El ADR 0013 ató a esa misma variable el segundo factor de los
administradores de empresa.

La tabla `users` ya tiene sitio para el secreto (`two_factor_secret`, cifrado en reposo por
la aplicación) y para la fecha de activación (`two_factor_enabled_at`). La sesión ya tiene
`two_factor_verified_at`. Falta decidir cómo se genera el código, cómo se da de alta, qué
pasa si se pierde el teléfono y cómo se defiende contra quien ya tiene la contraseña.

El propietario del producto decidió, al revisar el prototipo:

- El segundo factor es **solo para el super administrador**. Los administradores de
  empresa no lo llevan.
- Código de **app autenticadora**, dado de alta con **código QR y la clave en texto**.
- **Sin códigos de respaldo.** Si alguien pierde el teléfono, **otro super administrador le
  restablece el segundo factor**.
- El código se pide **en cada inicio de sesión**, y vale lo que dura esa sesión.

## Decisión

**Uno. RN-005 queda en el super administrador.** La regla pasa a decir: el segundo factor
es obligatorio para el super administrador. Se retira la puerta que lo pedía a quien tiene
`user:update` o `role:update` en una empresa, junto con `COMPANY_ADMINISTRATION_PERMISSIONS`.
Esto sustituye el punto del ADR 0013 que ataba a los administradores de empresa a la
suspensión.

**Dos. TOTP según RFC 6238, escrito sobre `node:crypto`.** HMAC-SHA1, 6 dígitos, paso de
30 segundos. Son los valores que entienden todas las apps autenticadoras; cambiar cualquiera
deja fuera a alguna. Se acepta el paso actual y uno a cada lado, para tolerar un reloj de
teléfono desviado hasta 30 segundos. La comparación es de tiempo constante. Son unas
cuarenta líneas, y se prueban con los vectores del propio RFC.

**Tres. Un código no se usa dos veces.** Se guarda el último paso aceptado en una columna
nueva, `two_factor_last_used_step`, y se rechaza cualquier código de ese paso o de uno
anterior. Sin esto, quien vea un código por encima del hombro lo puede repetir durante un
minuto y medio.

**Cuatro. El secreto se cifra con AES-256-GCM** y una clave de la configuración,
`TWO_FACTOR_ENCRYPTION_KEY`, de 32 bytes. El valor guardado lleva delante una versión
(`v1:`), para poder rotar la clave sin adivinar con cuál se cifró cada fila. La clave vive
donde las demás, según `docs/standards/configuration-and-secrets.md`. Robar la base no
basta para generar códigos: hace falta además la clave del despliegue.

**Cinco. El alta se confirma con un código antes de quedar activa.** Al pedir el alta se
genera un secreto de 20 bytes al azar y se guarda cifrado, con `two_factor_enabled_at` en
nulo: está pendiente. Solo un código válido de ese secreto lo activa. Activarlo cuenta como
verificación de la sesión en curso. Volver a la pantalla de alta con uno pendiente enseña
el mismo, para que un QR ya escaneado siga sirviendo.

**Seis. El QR se dibuja en el servidor con la biblioteca `qrcode`.** Devuelve un SVG que
viaja ya dibujado; el secreto nunca llega a código de terceros en el navegador. Es la
dependencia nueva de este registro.

**Siete. Un código equivocado cuenta como una contraseña equivocada.** Suma al mismo
contador de intentos de la cuenta (`failed_login_attempts`) y dispara el mismo bloqueo:
cinco fallos, quince minutos. Al bloquearse se cierra la sesión a medio verificar. Quien ya
tiene la contraseña no gana intentos ilimitados por estar en el segundo paso.

**Ocho. Otro super administrador restablece.** Un permiso nuevo,
`platform.two_factor:reset`, borra el secreto, la fecha de activación y el último paso, y
cierra todas las sesiones de esa persona. Nadie se restablece a sí mismo: eso anularía el
factor para quien solo tiene la contraseña. Queda en la bitácora con quién lo hizo y a
quién.

**Nueve. La variable `PLATFORM_ADMIN_TWO_FACTOR` desaparece** cuando entren las pantallas,
y con ella la enmienda del ADR 0005 pasa a obsoleta. Hasta entonces sigue como está.
Se retiró el 2026-09-27, junto con el botón de restablecer y no antes: sin él, un super
administrador que perdiera el teléfono no tendría cómo volver a entrar.

Fuera de este registro: recordar el dispositivo, avisos por correo al activar o restablecer,
y llaves de seguridad físicas (WebAuthn).

## Alternativas consideradas

### Códigos de respaldo de un solo uso

Diez códigos entregados al activar, guardados como huella. A favor: quien pierde el
teléfono vuelve a entrar sin depender de nadie. En contra: hay que guardarlos bien, y un
código de respaldo robado es un segundo factor robado. Los descartó el propietario del
producto: prefiere que la recuperación pase por otra persona y quede registrada.

### Código por correo

A favor: nada que instalar. En contra: exige un servicio de correo que el proyecto no
tiene, y quien entra al correo entra al sistema, así que no es un factor independiente. Se
descartó.

### Una biblioteca de TOTP (`otpauth`, `otplib`)

A favor: código ya revisado por otros. En contra: una dependencia más para cuarenta líneas
de un algoritmo estable desde 2011, que los vectores del RFC comprueban por completo. Se
descartó; si el cálculo tuviera que crecer (otros algoritmos, HOTP por contador), se
reconsidera.

### `uqr` en lugar de `qrcode` para el QR

A favor: sin dependencias propias y más pequeña. En contra: versión 0.1, con pocos años de
uso. `qrcode` lleva más de una década y es la que usa la mayoría. Se prefirió la madurez;
sus dependencias (`pngjs`, `dijkstrajs`, `yargs`) solo corren en el servidor.

### Dejar el segundo factor también a los administradores de empresa

Era lo que decía RN-005. Lo retiró el propietario del producto: solo el super
administrador alcanza todas las empresas, y es la cuenta cuyo robo cuesta más.

## Consecuencias

**Positivas.** La cuenta que alcanza todas las empresas deja de depender solo de una
contraseña, y la variable que permite saltarlo en producción desaparece. No hay proveedor
externo ni coste.

**Negativas.**

- **Sin códigos de respaldo, un solo super administrador que pierda el teléfono queda
  fuera.** Solo se recupera a mano en la base, fuera de la aplicación y de su bitácora. Por
  eso la operación debe mantener **al menos dos super administradores**.
- Un administrador de empresa vuelve a entrar solo con contraseña. Su alcance es una
  empresa, pero dentro de ella decide quién entra y con qué.
- Una clave de cifrado más que custodiar. Perderla deja inservibles todos los segundos
  factores, y habría que restablecerlos todos.
- Una dependencia nueva, `qrcode`, con tres dependencias propias.

**Neutras.** Los permisos ganan `platform.two_factor:reset`, que la semilla añade al
catálogo.

## Impacto

- **Seguridad.** Superficie nueva: la pantalla de verificación, que acepta un secreto de 6
  dígitos. La defienden el bloqueo compartido con la contraseña y el rechazo de códigos
  repetidos.
- **Rendimiento.** Una lectura y una escritura de `users` por verificación. Nada en las
  demás peticiones.
- **Operación.** `TWO_FACTOR_ENCRYPTION_KEY` se añade a cada despliegue. En producción hay
  que dar de alta el segundo factor de cada super administrador en su primer acceso.
- **Migración.** Una columna nueva y tres restricciones en `users`, aditivas.

## Cumplimiento

- Pruebas unitarias del cálculo con los vectores del RFC 6238, de la ventana de tolerancia
  y del rechazo de un paso repetido.
- Prueba de integración: la cuenta de plataforma sin segundo factor superado no abre
  ninguna pantalla de plataforma ni entra a una empresa.
- Prueba negativa: nadie restablece su propio segundo factor, y quien no tiene
  `platform.two_factor:reset` no restablece el de nadie.
- La base rechaza una cuenta activada sin secreto.

## Revisión

Si aparece un segundo tipo de cuenta que alcance varias empresas, o si la operación queda
con un solo super administrador durante más de unos días, se reconsidera la falta de
códigos de respaldo.

# 0016. Despliegue en Vercel con Neon como etapa temporal hasta Azure

**Estado:** aceptada
**Fecha:** 2026-09-28
**Decide:** propietario del producto
**Consultados:** equipo de arquitectura, seguridad
**Relacionadas:** [0001](0001-stack-tecnologico.md),
[0009](0009-pruebas-de-integracion-en-rama-de-neon.md),
[0011](0011-integracion-continua-en-github-actions.md)

## Contexto

`CLAUDE.md` decía "Local por ahora. Contenedor listo para Azure más adelante", con el
registro pendiente. La realidad ya es otra: la aplicación se despliega en Vercel desde
GitHub y la base vive en Neon, con una rama `production` y otra `desarrollo`. Cada
propuesta de cambio recibe un despliegue de vista previa. Las migraciones de producción
se han aplicado a mano, con la credencial dueña del esquema obtenida al momento y nunca
impresa.

El destino sigue siendo un contenedor en Azure. Nada de eso existe todavía: no hay
`Dockerfile` ni infraestructura. Mientras tanto hace falta una forma de desplegar que no
se decida sola, y dejar escrito qué reglas se cumplen y cuáles no.

## Decisión

**La aplicación se despliega en Vercel, con la base en Neon, hasta que exista el
despliegue en Azure.** Es una etapa, no el destino.

1. **Entornos.** `main` despliega en producción. Cada propuesta de cambio despliega una
   vista previa. La vista previa nunca apunta a la rama `production` de Neon.
2. **Base de datos.** La aplicación se conecta con el rol `inventory_app`, sin privilegio
   para saltarse las políticas (ADR 0010), por el agrupador de conexiones. Las
   migraciones usan el rol dueño por conexión directa y nunca la aplicación.
3. **Migraciones a mano y con aprobación.** El despliegue no migra la base. Después de
   fusionar un cambio con migración, se ejecuta `npm run db:deploy` contra producción
   solo con la aprobación explícita de la persona en ese momento. La cadena de conexión
   se obtiene con `neonctl` en una variable y no se imprime. Como fusionar ya despliega el
   código, la migración va en su propia propuesta de cambio, compatible con el código que
   está en producción. Se aplica, y solo después se fusiona el código que la usa. Es el
   expandir, migrar y contraer de `.claude/agents/database-architect.md`, sección 7.
4. **Retroceso.** El código vuelve atrás promoviendo en Vercel el despliegue anterior. La
   base no vuelve atrás: se corrige con una migración nueva, o, en una emergencia,
   restaurando la rama de Neon a un momento anterior desde su consola.
5. **Portabilidad.** Nada del código depende de Vercel: ni paquetes `@vercel/*`, ni
   funciones que solo existan allí. Pasar a un contenedor tiene que ser escribir el
   `Dockerfile` y la infraestructura, no reescribir la aplicación.

### Excepción temporal a la regla de secretos

`docs/standards/configuration-and-secrets.md` pide que en producción los secretos vivan
en un gestor de secretos con identidad administrada, nunca en variables definidas a mano
en la consola. **En Vercel no se cumple**: los secretos son variables de entorno del
proyecto. Se acepta mientras dure esta etapa, con estas condiciones:

- Toda variable secreta se marca como sensible en Vercel, para que nadie pueda volver a
  leerla después de guardarla.
- Cada entorno tiene sus propios valores. Una clave de producción no se repite en vista
  previa ni en desarrollo.
- El acceso al proyecto de Vercel se limita a quien despliega.
- Una rotación es cambiar la variable y volver a desplegar, y queda anotada en el
  gestor de contraseñas donde se guarda el valor.

La excepción caduca con el despliegue en Azure, donde se aplica la regla completa: Key
Vault con identidad administrada.

## Alternativas consideradas

### Vercel como destino definitivo

A favor: ya funciona, las vistas previas son gratuitas y no hay infraestructura que
mantener. En contra: deja la regla de secretos incumplida para siempre y aleja el destino
que el ADR 0001 dibujó. El propietario del producto mantiene Azure como destino.

### Esperar a Azure para desplegar

A favor: se cumplirían todas las reglas desde el primer día. En contra: sin despliegue no
se prueba nada con usuarios reales, y el contenedor todavía no existe. Se descartó.

### Migrar en cada despliegue de producción

A favor: nadie tiene que acordarse. En contra: una migración defectuosa se aplica sin que
nadie la mire en el momento, y el proceso de construcción necesitaría la credencial dueña
del esquema. Se descartó.

## Consecuencias

**Positivas.** El despliegue deja de estar sin registrar, y la decisión pendiente de
`CLAUDE.md` se cierra. Cada propuesta de cambio se puede revisar funcionando antes de
fusionarla.

**Negativas.** Los secretos de producción no cumplen la regla hasta Azure. Aplicar
migraciones depende de que alguien lo haga, y un cambio de esquema tarda dos
fusiones en lugar de una.

**Neutras.** El paso a Azure pedirá su propio registro: imagen, registro de contenedores,
Key Vault, red y observabilidad.

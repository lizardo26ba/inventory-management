# 0017. La bitácora registra las consultas de todos los usuarios y no se purga

**Estado:** sustituida por [0018](0018-bitacora-de-cambios-sin-purga.md). Las consultas no se
registran; la bitácora guarda solo cambios
**Fecha:** 2026-09-28
**Decide:** propietario del producto
**Consultados:** equipo de arquitectura, seguridad
**Relacionadas:** [0005](0005-super-administrador-de-plataforma.md),
[0015](0015-auditoria-de-consultas-del-super-administrador.md) (enmendada por este)

## Contexto

El ADR 0015 decidió cómo registrar las consultas del super administrador dentro de una
empresa (RN-073). Dejó fuera a los miembros de la empresa. El propietario del producto
quiere lo contrario: la actividad de toda persona que use la aplicación queda en la
bitácora, no solo la de los administradores.

Las escrituras de cualquier usuario ya se registran (RN-070), igual que entrar, salir,
cambiar de empresa y cambiar la contraseña. Lo que faltaba son las consultas de los
miembros.

Al mismo tiempo, RN-074 seguía pendiente: cuánto tiempo se conserva la bitácora. El
propietario no quiere borrar nada.

Contar a todos cambia el volumen. Con solo los super administradores eran del orden de
cien megabytes al año. Con todos, y a modo de estimación sin medir (50 empresas, 10
personas cada una, 100 consultas diarias por persona), son unos 18 millones de entradas
y entre 15 y 25 gigabytes al año.

## Decisión

**Toda consulta de datos de empresa queda en la bitácora, la haga quien la haga, y la
bitácora se conserva sin plazo.**

1. **Quién.** Cualquier persona que ejerza un permiso de consulta dentro de una empresa:
   miembros y super administradores. RN-073 pasa a decir eso. La entrada del super
   administrador lleva además la marca de privilegio elevado, como hasta ahora (RN-072).
2. **Cómo.** El mecanismo del ADR 0015 no cambia: lo registra `requireCompanyPermission`,
   una entrada por pantalla, antes de leer, con el recurso y los filtros, nunca los datos.
   Si la entrada no se puede escribir, la consulta no ocurre, también para un miembro.
3. **Qué no.** La navegación que no lee datos de empresa, como abrir un menú o cambiar de
   idioma. Añadiría volumen sin responder a nada. Los intentos de entrar fallidos siguen
   en el registro de la aplicación: no tienen autor.
4. **Retención (RN-074): indefinida.** No hay purga. Encaja con RN-071: la bitácora no se
   edita ni se borra.
5. **Revisión por tamaño, no por fecha.** Cuando `audit_logs` pase de cinco gigabytes, o
   su pantalla de consulta deje de responder dentro del presupuesto de rendimiento, se
   decide cómo archivar. La salida prevista es partir la tabla por mes y llevar los meses
   viejos a almacenamiento en frío: sale de la base caliente, pero no se pierde. Tendrá su
   propio registro, y conviene tomarlo pronto: partir una tabla pequeña es barato, y una
   de decenas de millones de filas no.

## Alternativas consideradas

### Registrar solo lo que modifica la base

Menos volumen. En contra: una consulta indebida no deja rastro, y ese es el riesgo que el
ADR 0005 quiere cubrir. Además, el propietario quiere ver la actividad de todos. Se
descartó.

### Registrar toda la navegación

Máximo detalle de lo que hace cada persona. En contra: multiplica el volumen con entradas
que no dicen qué datos se vieron. Se descartó.

### Un plazo de retención con purga

La tabla no crecería sin límite. En contra: el propietario no quiere borrar, y un plazo
corto podría quedar por debajo de un mínimo legal en algún país. Se descartó; el
crecimiento se resuelve archivando.

## Consecuencias

**Positivas.** La bitácora responde qué vio y qué hizo cualquier persona, en cualquier
empresa. RN-074 deja de estar pendiente.

**Negativas.** Toda pantalla de consulta, para todos, añade una escritura antes de leer:
unos milisegundos más por pantalla. Si la bitácora no se puede escribir, nadie consulta,
así que su disponibilidad pasa a ser la de la operación entera. El archivo en frío llegará
probablemente en el primer año de uso real.

**Neutras.** Cada entrada guarda la dirección de red y el navegador, que son datos
personales. Si algún país donde se opere fija un plazo máximo para conservarlos, habrá que
tratar esas dos columnas sin borrar las entradas. Queda como pregunta abierta para
negocio y asesoría legal.

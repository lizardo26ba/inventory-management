# 0015. Auditoría de las consultas del super administrador en la puerta de permisos

**Estado:** aceptada
**Enmendada por:** [0017](0017-bitacora-de-toda-la-actividad-sin-purga.md), que extiende el registro a las consultas de todos los usuarios
**Fecha:** 2026-09-28
**Decide:** propietario del producto
**Consultados:** equipo de arquitectura, seguridad
**Relacionadas:** [0005](0005-super-administrador-de-plataforma.md),
[0010](0010-aislamiento-con-seguridad-a-nivel-de-fila.md),
[0013](0013-empresa-activa-en-la-sesion.md)

## Contexto

El ADR 0005 exige auditar también las lecturas del super administrador dentro de una
empresa, porque el riesgo principal de ese privilegio es la consulta indebida, no el cambio.
RN-073 lo confirma. Nada decidía cómo: qué cuenta como una consulta, qué se guarda de ella,
ni qué pasa si no se puede registrar.

Hoy casi no hay nada que registrar. La única pantalla de empresa es el resumen, que solo
lee el nombre, y entrar a la empresa ya queda en la bitácora (`auth.company_entered`). El
catálogo de productos será el primer dominio que lea datos de negocio, y conviene que nazca
cubierto en lugar de acordarse después.

Las escrituras ya se auditan dentro de su transacción. Una lectura no tiene transacción que
compartir, y la bitácora tiene que escribirse aparte.

## Decisión

**La puerta de permisos de empresa registra cada consulta que hace el super
administrador, una entrada por pantalla, y sin registro no hay consulta.**

1. **Qué es una consulta.** Ejercer un permiso de empresa cuya acción es de lectura (`read`,
   y `export` cuando exista) con la sesión dentro de una empresa como plataforma. Un
   miembro de la empresa no deja estas entradas: RN-073 es sobre el super administrador.
2. **Dónde.** En `requireCompanyPermission`, el mismo punto que ya decide si se puede. Una
   pantalla nueva queda cubierta por pedir su permiso, no por acordarse de registrar. Las
   decisiones de qué dibujar (`holdsCompanyPermission`) no registran nada: no leen datos.
3. **Una por pantalla.** Cada pantalla o exportación pide su permiso de consulta una vez, y
   cada vez que lo pide deja una entrada. Una página siguiente o un filtro nuevo es otra
   consulta, y otra entrada. No se registra cada registro mostrado.
4. **Qué guarda.** La acción `company_data.viewed`, la empresa consultada, el permiso
   ejercido, la marca de privilegio elevado, y qué se consultó: el recurso (por ejemplo,
   `product`) y los filtros que la pantalla declare al pedir el permiso. Nunca los datos
   que se muestran.
5. **Si la bitácora falla, la consulta no ocurre.** La entrada se escribe antes de leer. Si
   no se puede escribir, la puerta lanza y la pantalla muestra el error, igual que una
   escritura. Un acceso elevado sin rastro es justo lo que este registro quiere impedir.

Queda fuera: el número de registros que vio. Saberlo exige escribir después de leer, y eso
rompe el punto cinco: la consulta ya habría ocurrido cuando falla la entrada. La pantalla y
sus filtros bastan para responder qué miró y cuándo. También quedan fuera las lecturas
de plataforma que no entran en una empresa, como la lista de empresas o de usuarios: ya
exigen un permiso de plataforma, no leen datos de negocio de un cliente, y su registro, si
hace falta, será otra decisión.

## Alternativas consideradas

### Una entrada por registro mostrado

Máximo detalle: qué producto o qué cliente concreto vio. En contra: una lista de cien filas
escribe cien entradas, y la bitácora es la tabla que más crece. Se descartó; si hace falta
ese detalle, se añade al abrir la ficha de un registro, no a la lista.

### Registrar solo al abrir un detalle

Menos volumen. En contra: deja fuera las listas, las búsquedas y las exportaciones, que es
donde se consulta en masa. Se descartó.

### Mostrar la consulta aunque la bitácora falle

Nunca bloquea al soporte. En contra: un fallo de la bitácora, o provocarlo, deja una
consulta elevada sin rastro. Se descartó por el ADR 0005.

### Una llamada explícita en cada pantalla

Da más control sobre qué se guarda. En contra: una pantalla que la olvide queda sin
auditar, y nada lo detecta. Se descartó. La pantalla sigue pudiendo declarar sus filtros
al pedir el permiso.

## Consecuencias

**Positivas.** RN-073 se cumple por construcción: pedir el permiso es registrar. La
bitácora responde qué empresas consultó cada super administrador, qué miró en ellas y con
qué filtros.

**Negativas.** Cada consulta del super administrador añade una escritura y una transacción
antes de leer. Son pocas personas, así que el volumen es bajo, pero la retención (RN-074)
sigue pendiente y esta decisión la hace más urgente. Una pantalla que pida dos veces el
mismo permiso de consulta deja dos entradas.

**Neutras.** El catálogo de la bitácora gana la acción `company_data.viewed` y el tipo de
entidad `CompanyData`, que apunta a la empresa consultada.

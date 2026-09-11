# 0008. Rastreo por lote y por número de serie, configurable por producto

**Estado:** aceptada
**Fecha:** 2026-09-10
**Decide:** equipo de arquitectura
**Relacionadas:** [0002](0002-existencias-como-libro-de-movimientos.md), [0006](0006-operacion-multipais-y-multimoneda.md)

## Contexto

Negocio confirmó que el sistema debe manejar lotes, números de serie y fechas de caducidad.

Esto no es un campo más. El registro 0002 fijó que el saldo se lleva por producto y
almacén. Con lotes, el saldo pasa a llevarse por producto, almacén y lote, porque dos
unidades del mismo producto en el mismo almacén dejan de ser intercambiables: una caduca
antes que la otra. Con números de serie, cada unidad es única y la cantidad deja de ser el
dato principal.

La confirmación llegó antes de crear la primera migración, así que el cambio se hace sobre
el diseño y no sobre datos existentes.

## Decisión

**El rastreo se configura por producto**, mediante tres modos: sin rastreo, por lote, o por
número de serie. Un producto sin rastreo se comporta exactamente como antes, así que las
empresas que no necesiten esto no pagan complejidad.

**El lote es una entidad propia**, con código, fecha de fabricación, fecha de caducidad y
proveedor de origen. Se crea al recibir mercancía si su código todavía no existía. La
caducidad es opcional, porque hay productos que se loti­fican sin caducar.

**El saldo gana el lote como parte de su clave.** La unicidad pasa a ser producto, almacén y
lote. Como el lote es nulo para productos sin rastreo, y en PostgreSQL dos valores nulos no
chocan entre sí, la restricción única se declara en la migración con la cláusula que trata
los nulos como iguales. Sin eso, un mismo producto podría tener dos filas de saldo en el
mismo almacén, que es precisamente el defecto que la restricción debe impedir.

**La unidad serializada es una entidad propia**, con su estado y su ubicación actual. Un
movimiento de producto serializado enumera las unidades que mueve, y su cantidad debe
coincidir con ese conteo.

**El movimiento sigue siendo inmutable**, y ahora referencia el lote afectado. Todo lo
decidido en el registro 0002 se mantiene.

**Salida por caducidad más próxima.** Cuando un producto se rastrea por lote y caduca, el
sistema propone por omisión el lote que vence antes. Es una propuesta, no una imposición: el
operador puede elegir otro lote y queda registrado quién lo hizo.

Queda fuera del alcance el rastreo por ubicación dentro del almacén, que es un eje distinto
y puede añadirse después sin rehacer esto.

## Alternativas consideradas

**Lote como texto libre en el movimiento.** Mucho más simple. En contra, no permite
consultar el saldo por lote, ni alertar por caducidad, ni rastrear a qué clientes fue un
lote que hay que retirar del mercado. Esa trazabilidad es justamente la razón de existir de
los lotes. Descartada.

**Rastreo obligatorio para todos los productos.** Uniformaría el modelo y eliminaría los
campos nulos. En contra, obliga a inventar lotes para tornillos y cables, lo que carga con
trabajo inútil al personal de almacén y llena la base de lotes ficticios. Descartada.

**Serie modelada como un lote de una unidad.** Unificaría ambos casos en una sola entidad.
En contra, una unidad serializada tiene estado propio y ubicación propia, que un lote no
tiene, y forzar la analogía complicaría ambas cosas. Descartada.

## Consecuencias

**Positivas.** Trazabilidad completa desde el proveedor hasta el cliente, que es lo que
permite ejecutar un retiro de producto del mercado. Alertas por caducidad próxima.
Valoración más precisa, porque cada lote lleva su propio costo.

**Negativas.** El modelo de existencias se vuelve notablemente más complejo. Toda operación
de entrada y salida gana una decisión adicional, la del lote o las unidades. La interfaz de
almacén se complica: capturar una salida deja de ser escribir una cantidad. El número de
filas de saldo se multiplica por la cantidad de lotes vivos. Se acepta todo eso porque el
requisito es del negocio y no admite sustituto.

**Consecuencia que afecta a una decisión anterior.** La regla RN-036 fijaba costo promedio
ponderado. Con lotes, cada lote arrastra su propio costo de adquisición, lo que equivale a
identificación específica y no a promedio. Ambas cosas no pueden ser ciertas a la vez.
Queda como pregunta abierta para negocio, y mientras tanto el costo se guarda por lote, que
es la opción que conserva más información y permite calcular el promedio después.

## Impacto

- Seguridad: sin efecto directo.
- Rendimiento: el saldo por lote tiene más filas, pero los índices por producto, almacén y
  caducidad lo sostienen. La consulta de existencias totales pasa a ser una agregación.
- Operación: aparece un trabajo programado de alerta por caducidad próxima.
- Cumplimiento: en sectores regulados la trazabilidad por lote suele ser obligatoria, así
  que esto habilita esos mercados.

## Cumplimiento

- Prueba que verifica que un producto con rastreo por lote rechaza un movimiento sin lote.
- Prueba que verifica que un producto sin rastreo rechaza un movimiento con lote.
- Prueba que verifica que un producto serializado exige tantas unidades como cantidad
  declara el movimiento.
- Prueba que verifica que no puede existir más de una fila de saldo para el mismo producto,
  almacén y lote, incluido el caso de lote nulo.
- Prueba que verifica que cambiar el modo de rastreo con existencias distintas de cero se
  rechaza.
- Prueba de trazabilidad: dado un lote, se obtienen todos los clientes que lo recibieron.

## Revisión

Se reconsidera al incorporar ubicaciones dentro del almacén, que añadirían otro eje a la
clave del saldo.

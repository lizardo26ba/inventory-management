# 0006. Operación multipaís con moneda base por organización

**Estado:** aceptada
**Fecha:** 2026-09-10
**Decide:** equipo de arquitectura
**Relacionadas:** [0002](0002-existencias-como-libro-de-movimientos.md), [0003](0003-multiempresa-con-identificador-de-organizacion.md)

## Contexto

El sistema opera en varios países. Eso arrastra más consecuencias de las que sugiere la
palabra: monedas distintas, tipos de cambio que fluctúan, husos horarios que desplazan el
corte de los informes diarios, identificadores fiscales con formato y nombre propios en
cada país, y formatos de fecha y número que difieren.

Una organización puede además operar almacenes en más de un país, por lo que el país no es
un atributo exclusivo de la empresa.

El riesgo central es la valoración del inventario. Si el costo de las existencias se
guarda en la moneda de la compra, el valor del inventario cambia solo porque fluctuó el
tipo de cambio, lo que hace imposible cuadrar los informes contra la contabilidad.

## Decisión

**Moneda base por organización.** Cada organización declara la moneda en la que valora su
inventario y produce sus informes. Los costos de existencias se almacenan **siempre**
convertidos a esa moneda.

**Los documentos conservan su moneda pactada.** Una orden de compra o de venta guarda su
moneda, la tasa hacia la moneda base y ambos totales, el del documento y el convertido.

**La tasa se congela al confirmar el documento.** Nunca se recalcula. Un cambio posterior
del tipo de cambio no altera un importe histórico. Los tipos de cambio se guardan con
vigencia diaria y con la fuente de la que provienen.

**Precisión.** Los importes se almacenan en decimal con cuatro posiciones, y los tipos de
cambio con ocho. Los decimales de presentación de cada moneda se guardan en el catálogo,
porque no todas usan dos.

**País y huso horario en dos niveles.** La organización declara los suyos. Un almacén puede
declarar los propios, y cuando lo hace mandan sobre los de la organización para el corte
del inventario y para la hora que se muestra en cada movimiento. Todo instante se almacena
en tiempo universal coordinado y se convierte solo al presentar.

**El país define las reglas locales de los datos.** El catálogo de países guarda la
etiqueta del identificador fiscal y su patrón de validación, de modo que añadir un país no
requiera tocar código.

**Los catálogos de países, monedas y tipos de cambio son globales.** No llevan
identificador de organización, porque son datos del producto y no de cada cliente.

Queda fuera del alcance de esta versión la lista de precios por moneda, el cálculo de
impuestos por país y la conversión de unidades de medida entre sistemas.

## Alternativas consideradas

**Una moneda única para todo el sistema.** Simple. En contra, contradice el requisito y
obliga a convertir al capturar, perdiendo el importe realmente pactado con el proveedor.
Descartada.

**Guardar los costos en la moneda del documento y convertir al consultar.** A favor,
ningún dato derivado que pueda divergir. En contra, el valor del inventario cambiaría con
cada fluctuación del tipo de cambio, cada informe dependería de la tabla de tasas, y un
hueco en esa tabla rompería consultas históricas. Descartada por el requisito contable.

**Una organización por país.** Evita la multimoneda dentro de una empresa. En contra,
fragmenta el inventario de una misma empresa que opera almacenes en dos países y obliga a
consolidar por fuera. Descartada.

## Consecuencias

**Positivas.** El valor del inventario es estable y auditable. Los importes históricos son
reproducibles. Añadir un país es cargar una fila de catálogo, no desplegar código.

**Negativas.** Toda operación de compra y venta necesita una tasa disponible, lo que
introduce una dependencia de datos que puede faltar y debe manejarse con un error de
negocio claro en lugar de un fallo técnico. Se acepta almacenar importes derivados, con el
riesgo de divergencia que eso implica. La lógica de fechas se complica: el corte diario de
un informe depende del huso del almacén, no del servidor.

**Neutras.** La interfaz debe formatear números y fechas según la etiqueta de idioma, lo
que en cualquier caso hacía falta.

## Impacto

- Seguridad: sin efecto directo. Los catálogos globales son de solo lectura para las
  organizaciones.
- Rendimiento: los totales convertidos evitan agregaciones con conversión al vuelo.
- Operación: se necesita una carga diaria de tipos de cambio, con alerta cuando falte la
  tasa de una moneda en uso.
- Cumplimiento: la validación del identificador fiscal es por país y sale del catálogo.

## Cumplimiento

- Prueba que verifica que un movimiento de existencias nunca guarda costo en una moneda
  distinta de la base de su organización.
- Prueba que verifica que modificar un tipo de cambio no altera el total convertido de un
  documento ya confirmado.
- Prueba de corte de informe con almacenes en husos horarios distintos.
- Revisión de código que rechaza cualquier importe almacenado sin moneda asociada, y
  cualquier fecha almacenada sin zona.

## Revisión

Se reconsidera al incorporar cálculo de impuestos por país, que probablemente exija un
motor de reglas y un registro propio.

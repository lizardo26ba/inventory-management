# 0002. Modelar las existencias como libro de movimientos inmutable

**Estado:** aceptada
**Fecha:** 2026-09-10
**Decide:** equipo de arquitectura
**Relacionadas:** [0001](0001-stack-tecnologico.md)

## Contexto

Varios usuarios registran entradas, salidas y transferencias del mismo producto de forma
simultánea, con frecuencia desde terminales de almacén. El negocio exige poder explicar
cómo se llegó al saldo actual y detectar faltantes, lo que convierte el historial en un
requisito, no en una comodidad.

Actualizar una columna de cantidad obliga a bloquear la misma fila para cada operación,
serializa a todos los usuarios sobre el producto de mayor rotación y destruye la
información de cómo se formó el saldo.

## Decisión

Las existencias se derivan de `stock_movements`, una tabla de solo inserción donde cada
fila registra una entrada, salida, ajuste o transferencia con cantidad con signo, motivo,
referencia al documento de origen, momento y autor.

El saldo se materializa en `stock_levels`, con unicidad por producto y almacén,
actualizado dentro de la **misma transacción** que inserta el movimiento, en aislamiento
serializable y con reintento ante fallo de serialización.

Una corrección nunca modifica un movimiento existente. Se registra un movimiento nuevo de
signo contrario, con motivo de corrección y referencia al original.

## Alternativas consideradas

**Columna de cantidad con bloqueo pesimista.** Simple de implementar y de entender. En
contra, contención sobre una única fila por producto, ausencia total de historial e
imposibilidad de auditar. Descartada por rendimiento y por requisito de auditoría.

**Solo movimientos, calculando el saldo por agregación en cada consulta.** Elimina la
duplicación de estado y evita cualquier riesgo de divergencia. En contra, el coste de la
agregación crece con el historial, y la consulta de existencias es la más frecuente del
sistema. Descartada por rendimiento sostenido.

**Captura de eventos completa para todo el dominio.** Descartada por complejidad
desproporcionada para el tamaño del equipo y del problema.

## Consecuencias

**Positivas.** Historial completo y auditable por construcción. Las inserciones
concurrentes no compiten por la misma fila. El saldo es recalculable desde cero, lo que
da una verificación independiente de la consistencia. La trazabilidad hacia compras y
ventas es natural mediante la referencia del movimiento.

**Negativas.** Más escrituras por operación y estado duplicado entre el libro y el saldo,
que puede divergir ante un defecto. Se acepta la obligación de mantener un proceso de
conciliación periódico y una política de depuración por antigüedad cuando la tabla crezca.
La lógica de reintento ante fallo de serialización añade complejidad al acceso a datos.

**Neutras.** Los informes históricos se construyen sobre el libro, no sobre el saldo.

## Impacto

- Seguridad: la inmutabilidad del libro es un control antifraude. El permiso de ajuste
  manual es de los más sensibles del sistema y se audita en cada uso.
- Rendimiento: la consulta de existencias lee una tabla pequeña e indexada.
- Operación: se requiere un trabajo programado de conciliación que compare la suma de
  movimientos contra el saldo y alerte ante divergencia.

## Cumplimiento

Prueba automatizada que falla si algún repositorio actualiza la cantidad de existencias
fuera del flujo de movimientos. Prueba de concurrencia obligatoria en toda operación que
altere existencias. Restricción en base de datos que impide cantidad cero en un movimiento
y saldo negativo en el nivel.

## Revisión

Se reconsidera la materialización del saldo si el volumen de movimientos hace que la
conciliación deje de ser viable en la ventana de mantenimiento.

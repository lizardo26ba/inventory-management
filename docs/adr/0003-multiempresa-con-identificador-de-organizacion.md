# 0003. Multiempresa con base compartida e identificador de organización

**Estado:** aceptada
**Fecha:** 2026-09-10
**Decide:** equipo de arquitectura
**Relacionadas:** [0002](0002-existencias-como-libro-de-movimientos.md), [0004](0004-autenticacion-con-credenciales-propias.md)

## Contexto

El sistema debe servir a varias organizaciones cuyos datos no pueden mezclarse jamás. Una
fuga entre organizaciones es el fallo más grave que puede tener el producto, porque expone
costos, proveedores y márgenes a un tercero.

Añadir aislamiento después de haber construido el sistema obliga a revisar cada consulta
existente, por lo que la decisión se toma al inicio.

## Decisión

Base de datos y esquema compartidos, con una columna `organization_id` presente en **toda**
tabla de negocio.

Reglas derivadas, de obligado cumplimiento:

1. Toda clave única de negocio incluye la organización. El código de producto es único por
   organización, nunca globalmente.
2. Todo índice de consulta empieza por `organization_id`.
3. El identificador de organización **nunca** se acepta desde la petición del cliente. Se
   deriva de la sesión del servidor en el contexto de la operación.
4. El repositorio recibe siempre el contexto y aplica el filtro. Ningún método de acceso a
   datos puede consultar una tabla de negocio sin ese filtro.
5. Se activa seguridad a nivel de fila en PostgreSQL como segunda barrera, de modo que un
   defecto en la capa de aplicación no baste para exponer datos de otra organización.
6. Una persona puede pertenecer a varias organizaciones mediante una tabla de membresía.
   Sus roles y permisos son distintos en cada una.

## Alternativas consideradas

**Una base de datos por organización.** Aislamiento máximo y respaldo independiente por
cliente. En contra, cada migración debe aplicarse a todas las bases, el agrupador de
conexiones se multiplica y la operación se complica desde la primera organización.
Descartada por coste operativo frente al tamaño previsto.

**Un esquema de PostgreSQL por organización dentro de la misma base.** Punto intermedio.
En contra, Prisma no maneja bien el cambio dinámico de esquema por petición, y las
consultas entre organizaciones para administración se vuelven artificiales. Descartada por
fricción con la herramienta.

**Sin multiempresa, una instalación por cliente.** Descartada porque contradice el
requisito establecido y multiplica el coste de mantener versiones.

## Consecuencias

**Positivas.** Una sola migración, un solo despliegue, un solo agrupador de conexiones.
Alta de una organización nueva sin trabajo de infraestructura. Administración transversal
posible sin conectarse a varias bases.

**Negativas.** El aislamiento depende de la disciplina en el acceso a datos, y un olvido
de filtro es una fuga. Se acepta el coste de la doble barrera con seguridad a nivel de
fila y de una batería de pruebas de aislamiento. El respaldo y la restauración selectiva
de una sola organización requieren trabajo adicional. Los índices son más anchos.

**Neutras.** Los identificadores siguen siendo globalmente únicos, lo que simplifica las
referencias entre tablas.

## Impacto

- Seguridad: aparece una clase de vulnerabilidad propia, la referencia directa a un
  objeto de otra organización. Se cubre en el modelo de amenazas y en la revisión.
- Rendimiento: los índices deben ordenarse con la organización primero para que sean
  selectivos.
- Operación: la retirada de datos de una organización que se da de baja necesita un
  procedimiento documentado.

## Cumplimiento

- Batería de pruebas de aislamiento que, para cada operación de lectura y escritura,
  verifica que un actor de una organización no alcanza datos de otra.
- Revisión de código que rechaza cualquier consulta a una tabla de negocio sin filtro de
  organización.
- Seguridad a nivel de fila activa en todas las tablas de negocio, con la organización de
  la sesión establecida al inicio de cada transacción.

## Revisión

Se reconsidera si alguna organización exige aislamiento físico por contrato o por
regulación, en cuyo caso se evaluará una instancia dedicada para ese caso concreto sin
cambiar el modelo general.

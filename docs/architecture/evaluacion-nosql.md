# Evaluación: PostgreSQL frente a MongoDB para este sistema

**Audiencia:** desarrollo, negocio
**Estado:** vigente
**Responsable:** equipo de arquitectura
**Última revisión:** 2026-09-10

Evalúa qué costaría llevar el diseño actual a MongoDB y qué garantías habría que
reimplementar a mano. No es un registro de decisión: es el insumo para tomarla.

## 1. Resumen

Recomendación: **mantener PostgreSQL**. MongoDB es una base de datos sólida y varias de
las objeciones que se le suelen hacer están desactualizadas, pero en este sistema concreto
obligaría a reimplementar en código de aplicación entre cinco y siete garantías que hoy
sostiene el motor, y cada una de ellas es un lugar donde puede aparecer un saldo de
inventario incorrecto.

Aparte de eso, conviene separar dos asuntos que llegaron juntos. La evaluación de NoSQL es
una decisión de arquitectura. La imposibilidad de usar Docker es un problema de instalación
local. MongoDB no resuelve el segundo: también hay que instalarlo, y además su modo
transaccional exige configurarlo como conjunto de réplicas, lo que en local es más trabajo
que instalar PostgreSQL, no menos.

## 2. Lo que este sistema exige

Estas son las garantías que el diseño actual da por sentadas, con el requisito de negocio
que las origina.

| Garantía                                               | De dónde viene                    | Hoy la da                                           |
| ------------------------------------------------------ | --------------------------------- | --------------------------------------------------- |
| El saldo nunca queda negativo                          | Requisito explícito de negocio    | Restricción `CHECK` en la tabla                     |
| Movimiento y saldo se escriben juntos o no se escriben | Integridad del inventario         | Transacción serializable                            |
| Dos usuarios sobre el mismo producto no se pisan       | Requisito explícito de negocio    | Aislamiento serializable con reintento              |
| Ninguna empresa ve datos de otra                       | ADR 0003                          | Filtro en repositorio más seguridad a nivel de fila |
| Código de producto único por empresa                   | Regla de negocio                  | Índice único compuesto                              |
| Correlativo de documentos sin huecos                   | Requisito fiscal en varios países | Bloqueo de fila sobre la secuencia                  |
| Importes con precisión decimal exacta                  | Multimoneda, ADR 0006             | Tipo `NUMERIC`                                      |
| Nadie borra ni altera un movimiento                    | Auditoría                         | Permisos y ausencia de rutas de escritura           |
| Sin referencias huérfanas                              | Consistencia del catálogo         | Claves foráneas                                     |

## 3. Qué pasa con cada una en MongoDB

**Saldo nunca negativo.** Se resuelve razonablemente bien. Una actualización condicional
atómica sobre el documento de saldo, que solo aplica si la cantidad disponible alcanza,
evita el saldo negativo sin bloqueo explícito. Es una solución legítima y eficiente. La
diferencia es que la regla vive en cada punto del código que descuenta, en lugar de estar
declarada una vez en el motor. Si mañana alguien escribe una ruta nueva y olvida la
condición, no hay red de seguridad.

**Movimiento y saldo juntos.** Son dos colecciones distintas, así que hace falta una
transacción multidocumento. MongoDB las soporta desde la versión cuatro, pero **solo
funcionan sobre un conjunto de réplicas**. Un nodo suelto instalado por omisión no las
tiene. En desarrollo local hay que configurar una réplica de un solo nodo, que es
precisamente el tipo de fricción de instalación que estamos tratando de evitar.

**Concurrencia entre usuarios.** Las transacciones de MongoDB usan control optimista: ante
conflicto, abortan y hay que reintentar en el código. Es equivalente a lo que ya hacemos
con el error de serialización de PostgreSQL, así que aquí no hay pérdida real.

**Aislamiento entre empresas.** Aquí sí hay pérdida clara. MongoDB no tiene un equivalente
a la seguridad a nivel de fila. El aislamiento pasaría a depender exclusivamente de que
ninguna consulta olvide el filtro de empresa. Perdemos la segunda barrera, que es la que
protege cuando la primera falla por descuido. Para un producto multiempresa, esto es lo más
grave de la lista.

**Unicidad por empresa.** Se resuelve igual de bien con un índice único compuesto.

**Correlativo sin huecos.** Se resuelve con un contador atómico. Funciona. El matiz es que
si la operación falla después de reservar el número, el hueco queda, y taparlo requiere
lógica adicional. En PostgreSQL el número se reserva dentro de la misma transacción que
crea el documento, así que el problema no existe.

**Precisión decimal.** MongoDB tiene un tipo decimal de ciento veintiocho bits que sirve
perfectamente. El problema no es el motor sino la herramienta: el conector de MongoDB de
Prisma no admite el tipo decimal. Los importes tendrían que guardarse como enteros en la
unidad mínima o como texto, con conversión manual en cada lectura y escritura. **Este punto
hay que verificarlo antes de decidir nada**, porque afecta a cada campo de dinero del
sistema.

**Inmutabilidad de los movimientos y ausencia de huérfanos.** No hay claves foráneas ni
restricciones. Ambas cosas pasan a ser convención del equipo, verificada solo por revisión
de código y por pruebas.

## 4. Qué haría MongoDB mejor

Esto también es cierto y conviene ponerlo sobre la mesa.

- **Una orden con sus líneas es un solo documento.** Guardar el pedido completo en una
  escritura es más natural que repartirlo en dos tablas, y leerlo no requiere unir nada.
- **Atributos variables por producto.** Si distintas empresas necesitan campos propios en
  su catálogo, un documento flexible lo absorbe sin migración. En PostgreSQL esto se
  resuelve con una columna de tipo JSON, que funciona pero es menos cómodo.
- **Escalado horizontal.** La fragmentación por empresa es un camino natural de crecimiento.
  PostgreSQL escala vertical y con réplicas de lectura, que para el volumen previsto sobra,
  pero el techo existe.
- **Sin migraciones formales.** Añadir un campo no requiere desplegar un cambio de esquema.
  Es una ventaja real en fases de exploración, y una desventaja cuando el modelo debe ser
  estable y auditable.

## 5. Qué costaría la migración

Trabajo que habría que rehacer sobre lo ya construido:

1. Reescribir el esquema completo, veintinueve modelos, y perder las restricciones.
2. Reescribir todos los repositorios, porque cambia el modelo de consulta.
3. Reimplementar en código las garantías de las secciones anteriores.
4. Sustituir el sistema de migraciones por scripts de transformación propios.
5. Reemplazar los importes decimales por una representación entera, con su capa de
   conversión y sus pruebas.
6. Escribir una batería de pruebas de aislamiento más exigente, porque desaparece la
   segunda barrera.
7. Configurar el conjunto de réplicas en desarrollo, en integración continua y en
   producción.

Los registros de decisión 0002, 0003 y 0006 quedarían sustituidos, porque los tres se
apoyan en garantías relacionales.

## 6. Cuándo sí tendría sentido

Para ser justos, MongoDB sería la elección correcta en un sistema con estas
características, y conviene revisar si alguna aplica:

- El modelo de datos es genuinamente variable entre clientes y no se puede normalizar.
- El volumen exige fragmentación horizontal desde el inicio.
- Las escrituras son mayoritariamente de documentos independientes, sin invariantes que
  crucen varios de ellos.
- La consistencia eventual es aceptable para el negocio.

Un sistema de inventario con control de existencias cumple exactamente lo contrario en los
cuatro puntos. Su valor está en que el saldo sea correcto, y el saldo es una invariante que
cruza documentos.

## 7. El problema de fondo, que es otro

La razón por la que surgió esta pregunta es que Docker no funciona sin virtualización. Ese
problema tiene tres soluciones que no tocan la arquitectura:

- **Instalador nativo de PostgreSQL para Windows.** No usa virtualización de ningún tipo.
  Es un instalador corriente.
- **PostgreSQL en la nube en capa gratuita**, con Neon o Supabase. No se instala nada, solo
  hace falta la cadena de conexión.
- **PostgreSQL portable**, descomprimido en una carpeta y arrancado a mano, sin instalación
  ni permisos de administrador.

Cualquiera de las tres desbloquea el trabajo hoy mismo.

## 8. Recomendación

Mantener PostgreSQL y resolver la instalación por la vía nativa o por la nube gratuita.

Si aun así quieres explorar MongoDB, la forma responsable no es decidir sobre este
documento, sino hacer una prueba de concepto acotada: implementar solo el registro de una
salida de inventario con dos usuarios simultáneos sobre el mismo producto, verificando que
el saldo nunca queda negativo y que ningún movimiento se pierde. Es medio día de trabajo y
responde con hechos la única pregunta que importa aquí.

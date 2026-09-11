# Reglas de Negocio

**Audiencia:** negocio, desarrollo
**Estado:** vigente
**Responsable:** equipo de arquitectura
**Última revisión:** 2026-09-10

Catálogo único de las reglas que el sistema hace cumplir. Cada regla está redactada para
ser verificable: o el sistema la cumple o no la cumple, sin interpretación intermedia.

Este documento es la fuente de la que salen las pruebas automatizadas. Una regla sin
prueba es una intención, no una regla.

## Cómo leer este documento

**Estado de cada regla:**

- **Confirmada.** Decidida de forma explícita. Se implementa tal cual.
- **Supuesta.** La asumimos para poder avanzar. Negocio debe confirmarla o corregirla.
  Está aislada en el diseño para que cambiarla sea barato.

**Qué no está aquí.** Las decisiones técnicas que hacen posible cumplir estas reglas viven
en los registros de decisión de `docs/adr/`. Aquí solo está el qué exige el negocio, nunca
el cómo se resuelve.

## 1. Usuarios y acceso

| Id     | Regla                                                                                                    | Estado     |
| ------ | -------------------------------------------------------------------------------------------------------- | ---------- |
| RN-001 | Una persona puede pertenecer a varias empresas, con permisos distintos en cada una.                      | Confirmada |
| RN-002 | El acceso de un usuario a una empresa lo concede un administrador de esa empresa.                        | Confirmada |
| RN-003 | Solo el super administrador crea empresas.                                                               | Confirmada |
| RN-004 | El super administrador puede entrar a cualquier empresa, eligiéndola de forma explícita en cada ocasión. | Confirmada |
| RN-005 | El segundo factor es obligatorio para el super administrador y para los administradores de empresa.      | Confirmada |
| RN-006 | Suspender a un usuario o retirarle el acceso corta su sesión de inmediato, no al expirar.                | Confirmada |
| RN-007 | Los permisos se agrupan en roles, y los roles se definen por empresa.                                    | Confirmada |
| RN-008 | Un usuario puede quedar limitado a ciertos almacenes dentro de su empresa.                               | Supuesta   |
| RN-009 | Roles iniciales: administrador, compras, ventas, almacén y consulta.                                     | Supuesta   |

## 2. Idioma y presentación

| Id     | Regla                                                                                                                | Estado     |
| ------ | -------------------------------------------------------------------------------------------------------------------- | ---------- |
| RN-010 | El idioma de la interfaz lo elige cada usuario, no la empresa.                                                       | Confirmada |
| RN-011 | Ningún texto de interfaz está escrito fijo. Todo se resuelve por clave de traducción.                                | Confirmada |
| RN-012 | Los datos capturados por la empresa, como nombres de productos, no se traducen. Se muestran tal como se escribieron. | Confirmada |
| RN-013 | Los mensajes de error que ve el usuario también son claves traducibles, no texto redactado en el servidor.           | Confirmada |
| RN-014 | Números y fechas se formatean según el idioma del usuario y la zona horaria del almacén.                             | Confirmada |

## 3. País y moneda

| Id     | Regla                                                                                                                           | Estado     |
| ------ | ------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| RN-020 | Cada empresa declara su país, su moneda base y su zona horaria.                                                                 | Confirmada |
| RN-021 | Una empresa puede operar almacenes en varios países, cada uno con su zona horaria.                                              | Confirmada |
| RN-022 | El inventario se valora siempre en la moneda base de la empresa.                                                                | Confirmada |
| RN-023 | Un documento conserva la moneda en que se pactó y la tasa de cambio del día en que se confirmó. Esa tasa no se recalcula nunca. | Confirmada |
| RN-024 | El identificador fiscal se valida según las reglas del país, y su nombre se muestra en el término local.                        | Confirmada |
| RN-025 | Una operación en moneda distinta de la base se rechaza si no hay tasa de cambio disponible para esa fecha.                      | Supuesta   |

## 4. Existencias

| Id     | Regla                                                                                                                                     | Estado                                   |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| RN-030 | El saldo de un producto en un almacén nunca puede ser negativo.                                                                           | Confirmada                               |
| RN-031 | Una salida que dejaría el saldo por debajo de cero se rechaza, sin excepción ni permiso que la autorice.                                  | Confirmada                               |
| RN-032 | Cuando dos o más usuarios operan sobre el mismo producto a la vez, ningún movimiento se pierde ni se duplica, y el saldo final es exacto. | Confirmada                               |
| RN-033 | Un movimiento registrado no se edita ni se borra. Un error se corrige con un movimiento de signo contrario que apunta al original.        | Confirmada                               |
| RN-034 | Todo movimiento registra quién lo hizo, cuándo, el motivo y el documento de origen.                                                       | Confirmada                               |
| RN-035 | Una transferencia entre almacenes es una salida y una entrada que ocurren juntas. Si una falla, ninguna queda registrada.                 | Confirmada                               |
| RN-036 | El costo del inventario se calcula por promedio ponderado, recalculado en cada entrada.                                                   | En conflicto con RN-081, ver sección 4.1 |
| RN-037 | Un producto con saldo distinto de cero no se puede dar de baja.                                                                           | Supuesta                                 |
| RN-038 | El umbral de reposición genera alerta, no bloquea operaciones.                                                                            | Supuesta                                 |

## 4.1 Lotes, series y caducidad

Confirmado por negocio. Ver [ADR 0008](../adr/0008-rastreo-por-lote-y-numero-de-serie.md).

| Id     | Regla                                                                                                                                              | Estado               |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| RN-080 | Cada producto se configura con uno de tres modos: sin rastreo, por lote, o por número de serie.                                                    | Confirmada           |
| RN-081 | En productos con lote, el saldo se lleva por producto, almacén y lote. Dos unidades del mismo producto con lotes distintos no son intercambiables. | Confirmada           |
| RN-082 | Un lote tiene código, y opcionalmente fecha de fabricación y de caducidad.                                                                         | Confirmada           |
| RN-083 | En productos con número de serie, cada unidad es única y su cantidad siempre es uno.                                                               | Confirmada           |
| RN-084 | Toda entrada o salida de un producto rastreado exige indicar el lote o las unidades. Sin eso se rechaza.                                           | Confirmada           |
| RN-085 | Un producto sin rastreo rechaza movimientos que indiquen lote o serie.                                                                             | Confirmada           |
| RN-086 | El modo de rastreo no se puede cambiar si el producto tiene existencias distintas de cero.                                                         | Confirmada           |
| RN-087 | Dado un lote, el sistema debe poder listar a qué clientes se despachó, para ejecutar un retiro del mercado.                                        | Confirmada           |
| RN-088 | En una salida, el sistema propone el lote de caducidad más próxima. El operador puede elegir otro, y queda registrado.                             | Supuesta             |
| RN-089 | Un lote vencido no puede despacharse a un cliente.                                                                                                 | Pendiente de negocio |

## 5. Compras

| Id     | Regla                                                                                                       | Estado     |
| ------ | ----------------------------------------------------------------------------------------------------------- | ---------- |
| RN-040 | Una recepción genera entradas de inventario por las cantidades efectivamente recibidas, no por las pedidas. | Confirmada |
| RN-041 | Una orden de compra admite varias recepciones parciales.                                                    | Confirmada |
| RN-042 | No se puede recibir más cantidad de la pedida en una línea.                                                 | Supuesta   |
| RN-043 | Una orden cancelada no admite recepciones.                                                                  | Supuesta   |
| RN-044 | El costo de entrada es el de la orden, convertido a moneda base con la tasa del documento.                  | Confirmada |

## 6. Ventas

| Id     | Regla                                                                                           | Estado     |
| ------ | ----------------------------------------------------------------------------------------------- | ---------- |
| RN-050 | Un despacho genera salidas de inventario por las cantidades efectivamente despachadas.          | Confirmada |
| RN-051 | Un pedido admite varios despachos parciales.                                                    | Confirmada |
| RN-052 | No se puede despachar más cantidad de la pedida en una línea.                                   | Supuesta   |
| RN-053 | Confirmar un pedido reserva las existencias, que dejan de estar disponibles para otros pedidos. | Supuesta   |
| RN-054 | Cancelar un pedido libera la reserva.                                                           | Supuesta   |

## 7. Numeración de documentos

| Id     | Regla                                                                                  | Estado     |
| ------ | -------------------------------------------------------------------------------------- | ---------- |
| RN-060 | Cada documento lleva un correlativo sin huecos, por empresa, país y tipo de documento. | Confirmada |
| RN-061 | El correlativo se reinicia cada año.                                                   | Supuesta   |
| RN-062 | Formato provisional: tipo, país, año y seis dígitos. Ejemplo, `OC-GT-2026-000001`.     | Supuesta   |
| RN-063 | Un número asignado no se reutiliza, aunque el documento se cancele.                    | Supuesta   |

## 8. Auditoría

| Id     | Regla                                                                                                                       | Estado               |
| ------ | --------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| RN-070 | Toda operación que modifique inventario, permisos o datos maestros queda registrada con su autor.                           | Confirmada           |
| RN-071 | La bitácora de auditoría no se edita ni se borra desde la aplicación.                                                       | Confirmada           |
| RN-072 | Las acciones del super administrador se registran indicando la empresa afectada y que se ejecutaron con privilegio elevado. | Confirmada           |
| RN-073 | Las consultas de datos que hace el super administrador dentro de una empresa también se registran.                          | Confirmada           |
| RN-074 | Plazo de retención de la bitácora.                                                                                          | Pendiente de negocio |

## 9. Preguntas abiertas para negocio

Estas no son reglas todavía. Son decisiones que nadie ha tomado y que conviene resolver
antes de que el diseño las fije por omisión.

1. ¿Cuánto tiempo debe conservarse la bitácora de auditoría? Hay países con mínimo legal.
2. ¿El correlativo debe cumplir algún requisito fiscal en los países donde se opera?
3. **Costeo con lotes.** RN-036 fijaba promedio ponderado, pero con lotes cada uno arrastra
   su propio costo de adquisición, que es identificación específica y no promedio. Ambas
   cosas no pueden ser ciertas a la vez. Mientras negocio decide, el costo se guarda por
   lote, que conserva más información y permite calcular el promedio después.
4. ¿Hay impuestos que calcular en compras y ventas, y varían por país?
5. ¿Se necesitan listas de precios por cliente o por moneda?
6. ¿Una devolución de cliente entra al mismo almacén y con qué costo?
7. ¿Quién puede autorizar un ajuste manual de inventario y hasta qué monto?

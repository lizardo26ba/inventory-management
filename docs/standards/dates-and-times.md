# Fechas y horas

**Audiencia:** desarrollo
**Estado:** vigente
**Responsable:** equipo de arquitectura
**Última revisión:** 2026-09-11

Este documento fija cómo se genera, se guarda, se transporta y se presenta un instante.
Quien lo lea sabrá qué escribir cuando una columna pida una fecha con hora, y por qué no
se puede resolver con la hora del servidor.

## 1. La regla

**Todo instante se guarda en tiempo universal coordinado, y el valor que se guarda es el
momento actual en esa escala.** En el código, `new Date()`. En SQL, `now()`. Nada más.

La zona horaria se aplica al presentar y al cortar informes, nunca al guardar. Un dato
guardado no sabe quién lo va a leer, y la misma fila la van a mirar desde Guatemala, desde
México y desde un informe programado a medianoche.

## 2. Por qué

Un instante es un punto en la línea del tiempo. "Las diez de la mañana" no lo es: es un
punto más una zona, y sin la zona no dice nada. Guardar la hora local convierte cada
consulta en una conversión con datos que la fila ya no tiene.

Esto no es preferencia de estilo. Sin la regla ocurren tres cosas concretas:

- **El orden se rompe.** Dos filas escritas por servidores en zonas distintas se ordenan
  entre sí por un número que no mide lo mismo.
- **El horario de verano duplica y borra horas.** Hay instantes locales que ocurren dos
  veces al año y otros que no existen. Una hora local es ambigua por diseño.
- **Los cortes diarios dejan de cuadrar.** El corte de un informe depende de la zona del
  almacén, y solo se puede calcular si el dato guardado es absoluto.

## 3. Cómo se escribe

| Dónde               | Qué se usa                                     | Qué no se usa                                 |
| ------------------- | ---------------------------------------------- | --------------------------------------------- |
| Columna             | `DateTime @db.Timestamptz(6)`                  | `TIMESTAMP` sin zona, `DATE` para un instante |
| Valor de alta       | `@default(now())`                              | Una fecha calculada en el cliente             |
| Valor de cambio     | `@updatedAt`, o `new Date()` en el repositorio | `Date.now()` convertido a texto               |
| Consulta en SQL     | `now()`                                        | `current_date`, `localtimestamp`              |
| Frontera de entrada | `z.coerce.date()` sobre texto con zona         | Una cadena de fecha y hora sin zona           |

Tres precisiones que se olvidan:

1. **Un instante por operación.** Si una operación marca varias filas, el instante se
   calcula una vez y se reparte. Dos llamadas a `new Date()` en la misma transacción dan
   dos valores distintos, y entonces el dato dice que dos cosas simultáneas no lo fueron.
2. **Nunca se arma una fecha por partes.** Componer año, mes y día produce un instante en
   la zona de quien lo compone. Si hace falta el principio de un día en una zona, se
   calcula con esa zona declarada, y se documenta cuál se usó.
3. **La fecha sin hora es otro tipo de dato.** Un vencimiento de lote o un día de
   inventario físico son fechas civiles, no instantes, y no se convierten a ninguna zona.
   Esas van en `DATE` y se comparan como texto de calendario.

## 4. Cómo se transporta

La frontera de servidor entrega instantes en formato de fecha y hora con zona, siempre en
tiempo universal coordinado. Ver `docs/standards/api-documentation-rules.md`.

Un instante nunca viaja ya formateado desde el servidor. El formato depende del idioma de
quien mira, y eso solo se sabe al pintar.

## 5. Cómo se presenta

- Todo formato pasa por `src/lib/format.ts`. Ninguna pantalla llama a `Intl` por su cuenta.
- La zona de presentación será la del almacén, y en su defecto la de la organización.
  Nunca la del servidor. Ver RN-014 y RN-021 en `docs/architecture/reglas-de-negocio.md`.
- **Estado actual.** `formatDate` y `formatDateTime` fijan la zona en tiempo universal a
  propósito, no por descuido: el servidor y el navegador tienen que dibujar la misma
  cadena o React avisa de la discrepancia. Cuando exista la preferencia del usuario, esas
  dos funciones recibirán su zona y su idioma, y será el único sitio que haya que tocar.
- Cuando un dato se usa para coordinar con otra persona, se muestra la zona junto a la
  hora. "14:30" sin más obliga a preguntar de dónde.

## 6. Qué falla la revisión

- Una columna de instante que no sea `TIMESTAMPTZ`.
- Una fecha con hora recibida del cliente y guardada tal cual, sin pasar por el esquema de
  la frontera.
- Un corte de informe que use la zona del servidor.
- Varias llamadas al reloj dentro de una misma operación.
- Un instante formateado en el servidor.

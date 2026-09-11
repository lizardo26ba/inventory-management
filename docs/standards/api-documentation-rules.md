# Reglas de Documentación de API

**Audiencia:** desarrollo
**Estado:** vigente
**Responsable:** equipo de arquitectura
**Última revisión:** 2026-09-10

Define cómo se documenta cada operación de servidor del sistema, sea una Server Action
interna o un endpoint HTTP expuesto a terceros.

## 1. Alcance y fuente de verdad

- **Server Actions.** El contrato lo define el esquema Zod. La documentación se genera a
  partir de él y se complementa con la ficha descrita más abajo. El esquema manda: si la
  ficha y el esquema discrepan, la ficha está mal.
- **Endpoints HTTP.** Se documentan en OpenAPI en versión tres. La especificación se
  genera desde los esquemas Zod, nunca se escribe a mano en paralelo.
- Toda operación pública se documenta antes de implementarse. El contrato se acuerda
  primero.

## 2. Ficha obligatoria por operación

Cada operación se documenta con estos apartados, sin omitir ninguno:

1. **Nombre y propósito.** Una frase en lenguaje de negocio.
2. **Permiso requerido.** El identificador exacto en formato de recurso y acción, más
   cualquier condición sobre el recurso concreto.
3. **Entrada.** Cada campo con nombre, tipo, obligatoriedad, restricciones y ejemplo.
4. **Salida.** Estructura devuelta en caso de éxito, con ejemplo.
5. **Errores.** Todos los códigos posibles con su causa y qué debe hacer quien llama.
6. **Efectos secundarios.** Qué se escribe, qué se invalida en caché, qué eventos o
   trabajos en segundo plano se disparan, qué queda en la bitácora de auditoría.
7. **Idempotencia.** Si acepta clave de idempotencia y cómo se comporta ante repetición.
8. **Concurrencia.** Si requiere versión del registro y qué ocurre ante conflicto.
9. **Límite de tasa.** Cuota aplicable, si la hay.
10. **Ejemplo completo.** Llamada y respuesta reales y verificadas.

## 3. Convenciones de contrato

- Nombres de campo en `camelCase`, estables en el tiempo. Renombrar un campo es un cambio
  que rompe compatibilidad.
- Fechas en formato de fecha y hora con zona, siempre en tiempo universal coordinado.
- Cantidades y montos como cadena decimal, nunca como número de punto flotante, para
  evitar pérdida de precisión al serializar.
- Identificadores como cadena opaca. Quien consume no debe interpretar su formato.
- Listados con paginación por cursor, devolviendo el cursor siguiente y un indicador de
  si hay más resultados. Prohibido exponer desplazamiento numérico.
- Códigos de error como constantes estables en mayúsculas. El mensaje puede cambiar y
  traducirse, el código no.

## 4. Formato de error

Toda respuesta de error tiene la misma forma, sin excepción:

```json
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "No hay existencias suficientes en el almacén seleccionado.",
    "details": [{ "field": "quantity", "issue": "max", "max": "12.0000" }],
    "correlationId": "01J8ZT4K9M2QF7XN3B6Y0V5C1A"
  }
}
```

- El mensaje es apto para mostrarse al usuario final.
- Los detalles sirven para señalar el campo problemático en el formulario.
- El identificador de correlación permite rastrear la petición en los registros.
- Prohibido incluir trazas, sentencias SQL, nombres de tabla o rutas de archivo.

## 5. Versionado y compatibilidad

- Los endpoints públicos se versionan en la ruta. Las Server Actions internas no se
  versionan, pero sus cambios que rompen compatibilidad se anuncian en el historial.
- Cambios compatibles: añadir un campo opcional de entrada, añadir un campo de salida,
  añadir un valor de enumeración que quien consume ya trata por omisión.
- Cambios que rompen compatibilidad: eliminar o renombrar un campo, volver obligatorio un
  campo opcional, estrechar un tipo, cambiar el significado de un valor, cambiar el
  código de un error.
- Un campo que se retira se marca primero como obsoleto, con fecha de eliminación y
  alternativa indicada, y se mantiene al menos un ciclo de versión antes de quitarlo.
- Quien consume debe tolerar campos desconocidos en la respuesta. Se documenta
  explícitamente.

## 6. Ejemplos y verificación

- Todos los ejemplos usan datos ficticios evidentes. Ningún identificador, nombre de
  proveedor o precio real.
- Los ejemplos se validan automáticamente contra el esquema en integración continua. Un
  ejemplo que no valida rompe la construcción.
- Cada operación documentada tiene al menos una prueba que ejercita el ejemplo tal como
  está escrito.

## 7. Lista de verificación

- [ ] La ficha incluye los diez apartados obligatorios.
- [ ] El permiso requerido está indicado y coincide con el código.
- [ ] Todos los errores posibles están enumerados con su código estable.
- [ ] Los efectos secundarios y la entrada de auditoría están descritos.
- [ ] El comportamiento ante conflicto de concurrencia está documentado.
- [ ] Los ejemplos validan contra el esquema y están verificados.
- [ ] Si hay cambio incompatible, está anunciado en el historial con guía de migración.

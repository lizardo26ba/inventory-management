# 0020. El catálogo de componentes se enciende por configuración, y en la demo se ve en producción

**Estado:** aceptada
**Fecha:** 2026-09-28
**Decide:** propietario del producto
**Consultados:** equipo de frontend
**Relacionadas:** [0019](0019-catalogo-de-componentes-fuera-de-produccion.md) (enmendada por este),
[0016](0016-despliegue-en-vercel-hasta-azure.md)

## Contexto

El [ADR 0019](0019-catalogo-de-componentes-fuera-de-produccion.md) dejó el catálogo de
`/catalog` fuera de producción, con la guarda atada a `NODE_ENV`. Como Vercel construye
también las vistas previas en modo producción, el catálogo no se veía en ningún
despliegue, solo en local.

El proyecto es, por ahora, una demo. Enseñar los componentes en el sitio desplegado es
parte de lo que se quiere mostrar, y el catálogo no toca la base, ni la sesión, ni ningún
secreto: son componentes con datos inventados.

## Decisión

**El catálogo responde donde lo encienda la variable `COMPONENT_CATALOG_ENABLED`, y en la
demo se enciende en producción y en las vistas previas.**

- `true` lo enciende y `false` lo apaga, en cualquier entorno. Cualquier otro valor hace
  fallar el arranque.
- Sin la variable rige la regla del 0019: se ve fuera de producción y no dentro. Un
  despliegue nuevo no lo enseña por descuido.
- En Vercel se define como `true` en _Production_ y en _Preview_.
- La regla vive en `src/lib/config/component-catalog.ts` y la aplica el marco del
  catálogo, igual que antes.

Enmienda del 0019 el punto "responde 404 en producción". El resto sigue vigente: qué
enseña, qué puede importar y la prueba de cobertura.

## Alternativas consideradas

### Encenderlo solo en las vistas previas

Producción quedaría intacta y las vistas previas suelen ir protegidas por Vercel. En
contra: en una demo lo que se enseña es el sitio de producción, y el enlace de una vista
previa cambia con cada propuesta de cambio. Queda como la opción natural cuando el
proyecto deje de ser demo.

### Quitar la guarda

Más simple. En contra: la decisión quedaría fija en el código, y apagarlo más adelante
obligaría a un cambio y a un despliegue en lugar de a quitar una variable. Se descartó.

### Abrirlo en producción detrás del permiso del super administrador

Solo lo vería quien tenga ese privilegio. En contra: para una demo esconde justo lo que
se quiere enseñar, y convierte una herramienta de desarrollo en una pantalla del producto
que habría que auditar y mantener. Se descartó.

## Consecuencias

**Positivas.** La demo enseña sus componentes en el sitio real. Encenderlo o apagarlo en
un entorno es cambiar una variable, sin tocar código.

**Negativas.** Cualquiera con el enlace ve el catálogo sin iniciar sesión. Es un riesgo
aceptado por el propietario del producto mientras el proyecto sea una demo: no hay datos
reales ni secretos en él, y el sitio entero ya se declara `noindex`, así que no aparece
en buscadores.

**Neutras.** Cuando el proyecto deje de ser demo hay que quitar la variable de
_Production_ en Vercel. Conviene revisarlo al mismo tiempo que la salida a Azure del
[ADR 0016](0016-despliegue-en-vercel-hasta-azure.md).

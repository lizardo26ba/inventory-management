# 0019. Catálogo de componentes propio, como ruta que no existe en producción

**Estado:** aceptada
**Fecha:** 2026-09-28
**Decide:** propietario del producto
**Consultados:** equipo de frontend
**Relacionadas:** [0001](0001-stack-tecnologico.md),
[0016](0016-despliegue-en-vercel-hasta-azure.md)

## Contexto

Los componentes compartidos de `src/components/ui` son propios: estilos y comportamiento
escritos en el proyecto, sin biblioteca de interfaz ni recursos externos. Ya son más de
treinta, y la única forma de ver uno era llegar a la pantalla real que lo usa, con sesión,
permisos y datos que lo pongan en el estado que interesa. Un diálogo de error o una tabla
vacía casi nunca se ven así.

El prototipo no sirve para esto. Tiene prohibido importar de `@/components`, a propósito,
y sus copias pueden diferir de las reales.

## Decisión

**Los componentes compartidos se ven en un catálogo propio, en `src/app/catalog`, que
responde `404` en producción.**

- Muestra las piezas reales de `src/components/ui`, con datos inventados, en todos sus
  estados y con el conmutador de tema y de idioma a mano.
- Solo importa de `@/components/ui` y de `@/lib`. No toca la base, ni las Server Actions,
  ni la sesión.
- La guarda está en su marco (`layout.tsx`) y lee `isProduction` de `src/lib/config`.
  Como Vercel construye las vistas previas en modo producción, tampoco aparece en ellas.
- Una prueba unitaria exige que cada archivo de `src/components/ui` esté en el catálogo,
  en la lista de pendientes o en la de archivos que no dibujan nada.

Queda fuera: decidir diseño en el catálogo. Eso sigue en el prototipo.

## Alternativas consideradas

### Storybook

Es el estándar y trae mucho hecho: controles, documentación, pruebas visuales. En contra:
es una dependencia grande con su propio sistema de compilación, que habría que mantener
alineado con la versión de Next.js y de Tailwind. Para piezas propias que ya compilan con
el mismo Next.js, una ruta más cuesta mucho menos. Se descartó.

### Ver los componentes dentro del prototipo

No añade nada nuevo. En contra: rompe la regla de que el prototipo no comparte piezas con
producción, que existe para poder experimentar sin miedo. Se descartó.

### Dejar el catálogo accesible en producción, detrás de un permiso

Serviría para revisar en el entorno real. En contra: es una pantalla que no forma parte
del producto y que habría que proteger, auditar y mantener. Se descartó.

## Consecuencias

**Positivas.** Cada componente se revisa aislado, en claro y oscuro, en ancho de teléfono
y en los dos idiomas, sin sesión ni datos. Es la página natural para pasar después una
revisión de accesibilidad y capturas de comparación.

**Negativas.** Es una copia más que mantener al día. La prueba de cobertura impide que un
componente nuevo falte, pero no que una muestra quede anticuada si cambia la forma de uno
que ya está.

**Neutras.** Las vistas previas de Vercel no lo muestran. Si hace falta verlo ahí, habrá
que sustituir `isProduction` por una variable propia en la configuración.

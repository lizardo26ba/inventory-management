# 0001. Adoptar Next.js, PostgreSQL y Prisma en TypeScript

**Estado:** aceptada
**Fecha:** 2026-09-10
**Decide:** equipo de arquitectura
**Relacionadas:** [0002](0002-existencias-como-libro-de-movimientos.md), [0003](0003-multiempresa-con-identificador-de-organizacion.md)

## Contexto

Se construye un sistema de inventario web, responsive, multiusuario, que en su primera
versión cubre existencias, compras y ventas. El equipo es pequeño. El sistema debe correr
en local durante el desarrollo y poder desplegarse en Azure más adelante sin reescritura.

Las fuerzas en tensión son la velocidad de entrega con un equipo reducido, la necesidad de
renderizado en servidor para que el navegador no cargue con la lógica de datos, y la
exigencia de integridad transaccional en las operaciones de existencias.

## Decisión

Se adopta un único proyecto en TypeScript estricto con Next.js en modo App Router, que
contiene interfaz y lógica de servidor. La persistencia es PostgreSQL, accedida
exclusivamente mediante Prisma. La validación de entrada usa Zod, con esquemas
compartidos entre cliente y servidor.

Queda fuera del alcance de esta decisión la plataforma de despliegue, que se resuelve en
un registro posterior cuando el proyecto salga de local.

## Alternativas consideradas

**Backend separado en .NET con frontend en React.** A favor, integración natural con
Azure y herramientas maduras. En contra, dos proyectos que mantener, dos despliegues y
duplicación de los modelos de datos entre lenguajes. Descartada por el tamaño del equipo.

**API REST separada en Node con frontend independiente.** A favor, frontera explícita
entre capas. En contra, la frontera se paga en serialización, en tipos duplicados y en
una segunda vuelta del navegador para obtener datos. Los componentes de servidor de
Next.js dan la misma separación sin ese coste.

**MongoDB como almacén principal.** Descartada sin discusión extensa. Las operaciones de
existencias exigen transacciones y restricciones de integridad que un almacén documental
complica sin ofrecer ventaja en este dominio.

## Consecuencias

**Positivas.** Un solo lenguaje y un solo repositorio. Tipos derivados del esquema de base
de datos hasta el formulario, sin escribirlos dos veces. Renderizado en servidor por
omisión, con actualización parcial de secciones sin recargar la página.

**Negativas.** Dependencia fuerte del modelo de componentes de servidor de Next.js, que
evoluciona rápido y obliga a seguir sus versiones. Prisma introduce una capa que hay que
rodear para consultas analíticas complejas. La frontera entre cliente y servidor es
implícita, lo que exige disciplina para no filtrar secretos al navegador.

**Neutras.** El equipo adopta Tailwind y shadcn/ui como sistema visual.

## Impacto

- Seguridad: la frontera cliente y servidor es el punto crítico. Se mitiga con el módulo
  único de configuración y con la verificación descrita en las reglas de secretos.
- Rendimiento: el objetivo es evitar la doble vuelta de datos al navegador.
- Operación: la aplicación es sin estado y se empaqueta en un contenedor, lo que mantiene
  abierta la puerta a Azure Container Apps.

## Cumplimiento

Regla de dependencias entre capas verificada en revisión de código. Analizador estático
con la prohibición de leer variables de entorno fuera del módulo de configuración.

## Revisión

Se reconsidera si el equipo crece hasta necesitar despliegues independientes por dominio,
o si aparece un consumidor externo que exija una API pública estable.

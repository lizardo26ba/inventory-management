# 0004. Autenticación con credenciales propias y sesión en cookie

**Estado:** sustituida por [0007](0007-sesion-propia-sin-libreria-de-autenticacion.md)
**Fecha:** 2026-09-10
**Decide:** equipo de arquitectura
**Relacionadas:** [0003](0003-multiempresa-con-identificador-de-organizacion.md)

> **Aviso.** La elección de Auth.js como librería quedó sustituida por el registro
> [0007](0007-sesion-propia-sin-libreria-de-autenticacion.md), porque su versión compatible
> está en beta y la estable anterior no admite sesiones en base de datos con credenciales.
> El resto de disposiciones de este documento sigue vigente.

## Contexto

El sistema es multiempresa y no puede asumir que las organizaciones cliente tengan un
directorio corporativo. Además, buena parte de quienes lo usan trabaja en almacén y puede
no tener cuenta corporativa. El desarrollo ocurre en local, sin acceso a un directorio
externo.

## Decisión

Autenticación con correo y contraseña gestionada por la propia aplicación, mediante
Auth.js con sesión persistida en base de datos y transportada en cookie.

Parámetros de la decisión:

- Contraseñas con Argon2id, con los parámetros de coste declarados en configuración y
  revisables sin cambiar código.
- Longitud mínima amplia en lugar de reglas de composición, y contraste contra listas de
  contraseñas filtradas.
- Cookie con las marcas de solo servidor y transporte seguro, y política de mismo sitio en
  modo laxo.
- Rotación del identificador de sesión al iniciar sesión y al cambiar de organización
  activa.
- Segundo factor por aplicación de códigos temporales, **obligatorio** para toda cuenta
  con permisos de administración de la organización.
- Límite de intentos con retardo progresivo, y respuesta indistinguible entre usuario
  inexistente y contraseña incorrecta.
- Recuperación de contraseña con enlace de un solo uso, de vida corta, que invalida todas
  las sesiones activas al completarse.

La sesión almacena la organización activa. Un usuario que pertenece a varias organizaciones
la cambia de forma explícita, lo que rota la sesión y revalida sus permisos.

## Alternativas consideradas

**Microsoft Entra ID como único proveedor.** A favor, sin gestión de contraseñas y con
segundo factor heredado del directorio. En contra, exige que cada organización cliente use
Microsoft 365, bloquea el desarrollo local sin acceso al directorio y deja fuera al
personal de almacén sin cuenta corporativa. Descartada como opción única.

**Ambos desde el inicio.** Descartada por ahora para no sostener dos rutas de
autenticación antes de tener un cliente que lo pida. La decisión se toma de forma que el
proveedor federado pueda añadirse después sin migración de datos, porque Auth.js admite
varios proveedores sobre el mismo modelo de usuario.

**Tokens en el navegador.** Descartada. Cualquier script inyectado puede leerlos, y la
revocación inmediata se vuelve imposible.

## Consecuencias

**Positivas.** Funciona desde el primer día en local, sin dependencias externas. Control
total sobre el ciclo de vida de la cuenta y sobre la revocación inmediata de sesiones.
Encaja con el modelo multiempresa sin depender del directorio de cada cliente.

**Negativas.** El proyecto asume la custodia de las contraseñas, con todo lo que implica:
almacenamiento correcto, rotación de parámetros de coste, respuesta ante filtraciones y
soporte de recuperación. Se acepta como coste directo de la decisión. La sesión en base de
datos añade una lectura por petición, mitigable con caché de vida corta.

**Neutras.** El modelo de usuario queda preparado para añadir proveedores federados.

## Impacto

- Seguridad: la superficie principal pasa a ser el formulario de acceso. Se cubre con
  límite de tasa, segundo factor para administración y registro de intentos.
- Operación: se necesita un servicio de correo para la recuperación de contraseña.
- Cumplimiento: las contraseñas y los secretos de segundo factor nunca aparecen en
  registros ni en respuestas de error.

## Cumplimiento

Prueba automatizada que verifica que ninguna respuesta ni registro contiene el hash de la
contraseña ni el secreto del segundo factor. Prueba de límite de tasa en el acceso. Prueba
de que la recuperación invalida las sesiones activas.

## Revisión

Se añade Microsoft Entra ID como proveedor adicional cuando una organización cliente lo
requiera, lo que se registrará en un nuevo documento sin sustituir a este.

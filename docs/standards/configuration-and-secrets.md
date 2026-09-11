# Reglas de Configuración y Gestión de Secretos

**Audiencia:** desarrollo, operaciones
**Estado:** vigente
**Responsable:** equipo de arquitectura
**Última revisión:** 2026-09-10

Ningún valor de configuración ni secreto se escribe en el código. Este documento define
dónde vive cada tipo de valor, cómo llega a la aplicación, quién puede verlo y cómo se
detecta una violación antes de que llegue al repositorio.

## 1. Clasificación de valores

Antes de escribir cualquier valor, clasifícalo. La categoría determina dónde vive.

| Categoría                     | Ejemplos                                                             | Dónde vive                                 | Visible en cliente            |
| ----------------------------- | -------------------------------------------------------------------- | ------------------------------------------ | ----------------------------- |
| Constante de dominio          | Estados de un movimiento, unidades de medida                         | Código, en un módulo de constantes         | Sí                            |
| Regla de negocio configurable | Días de caducidad de alerta, umbral de stock mínimo                  | Base de datos, editable por administración | Sí, vía API                   |
| Configuración por entorno     | URL base, región, nivel de registro                                  | Variable de entorno no sensible            | Solo si lleva prefijo público |
| Secreto                       | Cadena de conexión, clave de API, secreto de cliente, clave de firma | Gestor de secretos de la nube              | **Nunca**                     |

Regla práctica: si el valor cambia entre entornos, es configuración. Si además su
filtración causa daño, es secreto. Si no cambia nunca y no causa daño, es una constante y
va en el código con nombre descriptivo.

Un umbral de negocio no es una constante de código. Si administración querrá cambiarlo
sin desplegar, va en base de datos desde el primer día.

## 2. Punto único de acceso a la configuración

Existe **un solo módulo** en todo el proyecto que lee `process.env`. El resto del código
importa desde ahí y recibe valores ya validados y tipados.

```
src/lib/config/
  env.server.ts    Configuración y secretos de servidor. Marcado como solo servidor.
  env.client.ts    Solo valores públicos. Es el único que puede importar un componente
                   de cliente.
  index.ts         Reexporta lo apropiado según el contexto.
```

Reglas de este módulo:

- Valida todas las variables con un esquema Zod al arrancar el proceso. Si falta una o
  tiene formato inválido, la aplicación **no inicia** y el mensaje dice qué variable
  falta. Prohibido el arranque degradado con valores por omisión inventados.
- Sin valores por omisión para secretos. Un valor por omisión de secreto es un secreto
  quemado con otro nombre.
- Valores por omisión permitidos solo para configuración no sensible y no crítica, como
  el nivel de registro.
- `env.server.ts` importa el paquete `server-only`, de modo que cualquier intento de
  importarlo desde un componente de cliente falla en tiempo de compilación, no en
  producción.
- El objeto de configuración se congela tras validarse. Nadie lo modifica en caliente.

## 3. Separación entre servidor y cliente

Este es el punto donde más fugas ocurren en Next.js, porque el valor se incrusta en el
paquete del navegador durante la compilación y ya no se puede retirar.

- Solo las variables con el prefijo público llegan al navegador. Ese prefijo es una
  **declaración explícita de que el valor es público**, no un requisito técnico a
  satisfacer para que compile.
- Prohibido añadir el prefijo público a un valor para resolver un error de compilación.
  Si un componente de cliente necesita un secreto, el diseño está mal: esa lógica debe
  ejecutarse en el servidor.
- Toda variable con prefijo público pasa por revisión explícita de una segunda persona
  antes de fusionarse.
- La lista de variables públicas se documenta y se audita cada trimestre.
- Prueba automatizada que compila y busca en el paquete resultante cualquier valor del
  conjunto de secretos. Si aparece, la construcción falla.

## 4. Ciclo de vida por entorno

**Desarrollo local**

- Archivo `.env.local`, ignorado por el control de versiones sin excepción posible.
- Archivo `.env.example` versionado con **todas** las claves, su descripción, si es
  obligatoria y un valor de ejemplo claramente ficticio. Nunca un valor real.
- Cada persona genera sus propias credenciales de desarrollo contra servicios de prueba.
  **Ninguna credencial de producción existe en un equipo de desarrollo.** Esta regla no
  admite excepción por urgencia.
- La base local usa datos generados o anonimizados, jamás una copia de producción con
  datos reales.

**Integración continua**

- Los secretos se inyectan como secretos cifrados del proveedor, con acceso restringido
  por rama y por entorno.
- Los secretos no se pasan como argumentos de construcción de imagen, porque quedan en
  las capas y en el historial de la imagen.
- Los registros de la canalización enmascaran los valores. Prohibido imprimir el entorno
  para depurar.
- Las propuestas de cambio provenientes de bifurcaciones externas no reciben secretos.

**Producción**

- Los secretos viven en AWS Secrets Manager o Azure Key Vault, según la nube elegida.
  Nunca en variables de entorno definidas a mano en la consola, porque quedan visibles
  para cualquiera con acceso de lectura al servicio y no dejan rastro de rotación.
- La aplicación obtiene los secretos con **identidad administrada**, es decir un rol de
  AWS asociado a la tarea o una identidad administrada de Azure. Esto elimina la
  credencial inicial: no hay una clave que guardar para poder leer las claves.
- Los secretos se cargan al arrancar y se cachean en memoria con un tiempo de vida corto,
  para que una rotación se recoja sin redesplegar.
- Un secreto **jamás** se escribe en disco, ni en un archivo temporal, ni en un registro.

## 5. Rotación y respuesta a incidentes

- Toda credencial tiene periodo de rotación definido y automatizado donde el proveedor lo
  permita. Las de firma de sesión y las de base de datos son las prioritarias.
- La rotación se hace con solapamiento: se acepta la credencial nueva y la anterior
  durante una ventana, se despliega, y después se retira la anterior. Así no hay corte.
- **Un secreto que llegó al repositorio se considera comprometido para siempre.** Se rota
  de inmediato. Borrarlo con una confirmación nueva no basta: sigue en el historial, en
  las copias locales de cada persona y posiblemente en cachés de terceros.
- Procedimiento ante exposición, en este orden: rotar la credencial, revisar los registros
  de acceso en busca de uso indebido, limpiar el historial si el repositorio es público,
  y registrar un análisis posterior con la causa y la medida preventiva adoptada.
- Acceso de emergencia a producción mediante un procedimiento de excepción con
  aprobación, duración limitada y registro de auditoría. Se revisa cada uso.

## 6. Principio de mínimo privilegio

- Un conjunto de secretos por entorno, sin reutilización entre ellos. Una filtración en
  pruebas no debe abrir producción.
- Credenciales distintas por función: la aplicación, las migraciones y los informes usan
  usuarios de base de datos diferentes con permisos distintos.
- El acceso de lectura al gestor de secretos de producción se limita a las identidades de
  ejecución y a un grupo reducido de personas, con registro de cada lectura.
- Las claves de API de terceros se emiten con el alcance mínimo necesario y restringidas
  por origen o por dirección de red cuando el proveedor lo permita.

## 7. Detección automática

Ninguna regla se sostiene sin verificación mecánica. Se implementan tres barreras:

1. **Antes de confirmar.** Gancho de precommit con un detector de secretos, más una
   comprobación que rechace archivos de entorno. Es la barrera más barata.
2. **Antes de fusionar.** Análisis del historial completo de la rama en integración
   continua, con protección de envío activada en el proveedor de repositorio. Un hallazgo
   bloquea la fusión.
3. **En el código.** Regla del analizador estático que prohíbe leer `process.env` fuera
   del módulo de configuración, y regla que prohíbe cadenas con forma de URL, de clave o
   de cadena de conexión en el código fuente.

Ejemplo de la regla del analizador estático:

```js
// eslint.config.js
{
  files: ['src/**/*.{ts,tsx}'],
  ignores: ['src/lib/config/**'],
  rules: {
    'no-restricted-properties': ['error', {
      object: 'process',
      property: 'env',
      message: 'Lee la configuración desde src/lib/config, nunca process.env directo.',
    }],
    'no-restricted-syntax': ['error', {
      selector: "Literal[value=/^(https?:\\/\\/|postgres(ql)?:\\/\\/|sk-|AKIA)/]",
      message: 'URL o credencial en el código. Muévela a la configuración.',
    }],
  },
}
```

Cuando una excepción sea legítima, se suprime la regla en esa línea con un comentario que
explique el motivo. Sin motivo escrito, la revisión la rechaza.

## 8. Higiene en tiempo de ejecución

- El objeto de configuración nunca se registra completo. El registrador tiene una lista de
  claves a enmascarar y una prueba que verifica que ningún secreto aparece en la salida.
- Los mensajes de error mostrados al usuario no incluyen cadenas de conexión ni nombres de
  servicio internos.
- Sin endpoints de diagnóstico que expongan el entorno. Si existe uno de estado, devuelve
  únicamente si el servicio responde, sin detalle de configuración.
- Las trazas enviadas a servicios de monitoreo pasan por el mismo filtro de enmascarado.

## 9. Lista de verificación

- [ ] Ningún literal de URL, clave, identificador de cliente o cadena de conexión en el código.
- [ ] Todo valor nuevo está clasificado y ubicado según la tabla de la sección uno.
- [ ] La variable está declarada en el esquema de validación y en el archivo de ejemplo.
- [ ] Si lleva prefijo público, está justificado y revisado por una segunda persona.
- [ ] `process.env` solo se lee dentro del módulo de configuración.
- [ ] El secreto está en el gestor de la nube y se accede con identidad administrada.
- [ ] Existe periodo de rotación definido para toda credencial nueva.
- [ ] El detector de secretos corre en precommit y en integración continua.
- [ ] Ningún registro ni mensaje de error expone el valor.

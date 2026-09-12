/**
 * Configuración pública.
 *
 * Es el único módulo de configuración que un componente de cliente puede
 * importar, y por eso solo contiene valores que no causan daño si se leen: todo
 * lo de aquí viaja al navegador y queda a la vista de cualquiera.
 *
 * El prefijo público no es un requisito técnico que satisfacer para que compile.
 * Es una declaración de que el valor es público. Añadir una variable a este
 * archivo obliga a revisión de una segunda persona, y ponerle el prefijo a un
 * secreto para resolver un error de compilación está prohibido: si un componente
 * de cliente necesita un secreto, la lógica está en el lado equivocado.
 *
 * Las variables se leen una a una y con su nombre completo escrito a mano,
 * porque Next las sustituye por su valor al construir y no puede hacerlo si el
 * nombre se arma en tiempo de ejecución.
 */

import { z } from 'zod';

const clientSchema = z.object({
  appUrl: z.string().min(1),
  environmentLabel: z.string().min(1),
});

export type ClientEnvironment = Readonly<z.infer<typeof clientSchema>>;

function readClientEnvironment(): ClientEnvironment {
  const result = clientSchema.safeParse({
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    environmentLabel: process.env.NEXT_PUBLIC_ENVIRONMENT_LABEL,
  });

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  NEXT_PUBLIC_${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuración pública inválida:\n${details}`);
  }

  return Object.freeze(result.data);
}

export const clientEnv: ClientEnvironment = readClientEnvironment();

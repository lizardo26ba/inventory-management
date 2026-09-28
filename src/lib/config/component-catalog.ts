/**
 * Si el catálogo de componentes (`/catalog`) responde en este despliegue.
 *
 * Sin la variable, se ve fuera de producción y no dentro, que era la regla del
 * ADR 0019. Con ella, manda la variable en cualquier entorno: así la demo lo
 * enseña en producción y, cuando deje de ser demo, se apaga quitándola en
 * Vercel, sin tocar código. ADR 0020.
 *
 * Vive aparte de `env.server.ts` para poder probar la regla sin leer el entorno.
 */

/** Los dos únicos valores válidos. Cualquier otro hace fallar el arranque. */
export const COMPONENT_CATALOG_FLAG_VALUES = ['true', 'false'] as const;

export type ComponentCatalogFlag = (typeof COMPONENT_CATALOG_FLAG_VALUES)[number];

export function isComponentCatalogVisible(
  flag: ComponentCatalogFlag | undefined,
  isProduction: boolean,
): boolean {
  if (flag === undefined) return !isProduction;
  return flag === 'true';
}

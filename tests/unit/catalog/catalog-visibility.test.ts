/**
 * Dónde responde el catálogo de componentes.
 *
 * Si esta regla se equivoca, el catálogo aparece en un despliegue donde nadie lo
 * encendió, o desaparece de la demo sin que nadie lo apagara. ADR 0020.
 */

import { describe, expect, it, vi } from 'vitest';

import { isComponentCatalogVisible } from '@/lib/config/component-catalog';

describe('isComponentCatalogVisible', () => {
  it('sin la variable, se ve fuera de producción', () => {
    expect(isComponentCatalogVisible(undefined, false)).toBe(true);
  });

  it('sin la variable, no se ve en producción', () => {
    expect(isComponentCatalogVisible(undefined, true)).toBe(false);
  });

  it('encendida, se ve también en producción', () => {
    expect(isComponentCatalogVisible('true', true)).toBe(true);
  });

  it('apagada, no se ve ni siquiera fuera de producción', () => {
    expect(isComponentCatalogVisible('false', false)).toBe(false);
  });
});

const NOT_FOUND = 'NEXT_NOT_FOUND';

const visibility = vi.hoisted(() => ({ isComponentCatalogEnabled: false }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/config/env.server', () => visibility);
vi.mock('next/navigation', () => ({
  notFound: (): never => {
    throw new Error(NOT_FOUND);
  },
  usePathname: (): string => '/catalog',
}));

describe('el marco del catálogo', () => {
  it('responde 404 cuando el catálogo está apagado', async () => {
    visibility.isComponentCatalogEnabled = false;
    const { default: CatalogLayout } = await import('@/app/catalog/layout');

    expect(() => CatalogLayout({ children: null })).toThrow(NOT_FOUND);
  });

  it('se pinta cuando el catálogo está encendido', async () => {
    visibility.isComponentCatalogEnabled = true;
    const { default: CatalogLayout } = await import('@/app/catalog/layout');

    expect(() => CatalogLayout({ children: null })).not.toThrow();
  });
});

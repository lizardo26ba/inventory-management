'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { IconMoon, IconSun } from '@/components/ui/icons';
import { LanguageSwitcher } from '@/components/ui/language-switcher';

import { CATALOG_PATH } from './paths';

type NavEntry = { readonly slug: string; readonly title: string };

/**
 * El marco del catálogo: índice a la izquierda, contenido a la derecha.
 *
 * Lleva el conmutador de tema y el de idioma porque las dos cosas se revisan en
 * cada componente, y tener que ir a otra pantalla para cambiarlas hace que no se
 * revisen.
 */
export function CatalogShell({
  entries,
  children,
}: {
  readonly entries: readonly NavEntry[];
  readonly children: React.ReactNode;
}): React.ReactElement {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);

  function toggleTheme(): void {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.dataset['theme'] = next ? 'dark' : 'light';
  }

  return (
    <div className="bg-canvas min-h-dvh md:grid md:grid-cols-[14rem_1fr]">
      <aside className="border-border bg-surface border-b md:sticky md:top-0 md:h-dvh md:border-r md:border-b-0">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <Link href={CATALOG_PATH} className="text-sm font-semibold">
            Catálogo
          </Link>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Tema claro' : 'Tema oscuro'}
              className="rounded-control hover:bg-surface-muted inline-flex h-9 w-9 items-center justify-center"
            >
              {isDark ? <IconSun /> : <IconMoon />}
            </button>
          </div>
        </div>
        <nav aria-label="Componentes" className="px-2 pb-3">
          <ul className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
            {entries.map((entry) => {
              const href = `${CATALOG_PATH}/${entry.slug}`;
              const isCurrent = pathname === href;
              return (
                <li key={entry.slug}>
                  <Link
                    href={href}
                    aria-current={isCurrent ? 'page' : undefined}
                    className={`rounded-control block px-3 py-1.5 text-sm whitespace-nowrap ${
                      isCurrent
                        ? 'bg-primary-soft text-primary font-medium'
                        : 'text-text-muted hover:bg-surface-muted'
                    }`}
                  >
                    {entry.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <main className="min-w-0 px-4 py-6 md:px-8">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { IconMoon, IconSun } from '@/components/ui/icons';
import { LanguageSwitcher } from '@/components/ui/language-switcher';

import { CATALOG_PATH } from './paths';

/**
 * Deja el enlace de la página actual a la vista dentro del menú.
 *
 * En un teléfono el menú es una barra que se desplaza de lado, y al llegar a una
 * página del final el enlace marcado quedaba fuera, así que no se veía dónde se
 * estaba. En pantalla ancha pasa lo mismo en vertical cuando el menú no cabe.
 *
 * Se mueve el desplazamiento del menú y no se llama a `scrollIntoView`, que
 * también desplazaría la página entera para enseñar el enlace.
 */
function centerCurrentLink(nav: HTMLElement): void {
  const link = nav.querySelector<HTMLElement>('[aria-current="page"]');
  if (link === null) return;

  if (nav.scrollWidth > nav.clientWidth) {
    nav.scrollLeft = link.offsetLeft - (nav.clientWidth - link.offsetWidth) / 2;
  }
  if (nav.scrollHeight > nav.clientHeight) {
    nav.scrollTop = link.offsetTop - (nav.clientHeight - link.offsetHeight) / 2;
  }
}

type NavGroup = {
  readonly group: string;
  readonly entries: readonly { readonly slug: string; readonly title: string }[];
};

/**
 * El marco del catálogo: índice a la izquierda, contenido a la derecha.
 *
 * Lleva el conmutador de tema y el de idioma porque las dos cosas se revisan en
 * cada componente, y tener que ir a otra pantalla para cambiarlas hace que no se
 * revisen.
 */
export function CatalogShell({
  groups,
  children,
}: {
  readonly groups: readonly NavGroup[];
  readonly children: React.ReactNode;
}): React.ReactElement {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (navRef.current !== null) centerCurrentLink(navRef.current);
  }, [pathname]);

  function toggleTheme(): void {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.dataset['theme'] = next ? 'dark' : 'light';
  }

  return (
    <div className="bg-canvas min-h-dvh md:grid md:grid-cols-[14rem_1fr]">
      <aside className="border-border bg-surface border-b md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:border-r md:border-b-0">
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
        {/* En un teléfono las familias se funden en una sola barra que se
            desplaza de lado; los títulos de familia solo caben en la columna. */}
        {/* Es `relative` para que las posiciones de los enlaces se midan desde
            el menú y no desde la página. */}
        <nav
          ref={navRef}
          aria-label="Componentes"
          className="relative flex gap-1 overflow-x-auto px-2 pb-3 md:block md:flex-1 md:overflow-x-visible md:overflow-y-auto"
        >
          {groups.map(({ group, entries }) => (
            <div key={group} className="contents md:mb-4 md:block">
              <p className="text-text-muted hidden px-3 pb-1 text-xs font-medium tracking-wide uppercase md:block">
                {group}
              </p>
              <ul className="contents md:block">
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
            </div>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 px-4 py-6 md:px-8">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}

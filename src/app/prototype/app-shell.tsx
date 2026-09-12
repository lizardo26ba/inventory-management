'use client';

/**
 * Marco de la aplicación: navegación lateral, encabezado y área de contenido.
 *
 * La navegación cambia según dónde esté la persona, y eso es deliberado:
 *
 * - En la plataforma, que es donde entra un administrador, solo se ven las
 *   secciones de administración. La operación diaria no le corresponde: no hay
 *   una empresa elegida sobre la que operar, así que ofrecerla sería ofrecer
 *   una pantalla que no puede responder.
 * - Al entrar en una empresa aparece la operación, y con ella el camino de
 *   vuelta a la administración.
 *
 * Es cliente porque gestiona el cajón de navegación en pantallas pequeñas y el
 * cambio de tema. El contenido de cada pantalla llega como children y sigue
 * siendo de servidor donde puede serlo.
 */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { Avatar } from './ui/avatar';
import { useCompanyStore } from './company-store';
import { type Copy } from '@/lib/i18n';
import { useCopy } from '@/lib/i18n';
import { LanguageSwitcher } from './ui/language-switcher';
import { currentUser, type Company } from './fake-data';
import { CountryFlag } from './ui/flag';
import {
  IconArrowLeft,
  IconAudit,
  IconChevronDown,
  IconMenu,
  IconMoon,
  IconOrganizations,
  IconOverview,
  IconProducts,
  IconPurchases,
  IconSales,
  IconSearch,
  IconSignOut,
  IconStock,
  IconSun,
  IconUsers,
  IconWarehouse,
} from './ui/icons';

type NavItem = {
  readonly href: string;
  /**
   * El rótulo se pide con el catálogo del momento en lugar de guardarse ya
   * resuelto: la lista se declara una vez al cargar el módulo y el idioma puede
   * cambiar muchas veces después.
   */
  readonly label: (copy: Copy) => string;
  readonly Icon: (props: { readonly className?: string }) => React.ReactElement;
};

const OPERATION_ITEMS = [
  { href: '/prototype', label: (copy) => copy.nav.overview, Icon: IconOverview },
  { href: '/prototype/products', label: (copy) => copy.nav.products, Icon: IconProducts },
  { href: '/prototype/stock', label: (copy) => copy.nav.stock, Icon: IconStock },
  { href: '/prototype/warehouses', label: (copy) => copy.nav.warehouses, Icon: IconWarehouse },
  { href: '/prototype/purchases', label: (copy) => copy.nav.purchases, Icon: IconPurchases },
  { href: '/prototype/sales', label: (copy) => copy.nav.sales, Icon: IconSales },
] as const satisfies readonly NavItem[];

const ADMINISTRATION_ITEMS = [
  {
    href: '/prototype/organizations',
    label: (copy: Copy) => copy.nav.organizations,
    Icon: IconOrganizations,
  },
  { href: '/prototype/users', label: (copy) => copy.nav.users, Icon: IconUsers },
  { href: '/prototype/audit', label: (copy) => copy.nav.audit, Icon: IconAudit },
] as const satisfies readonly NavItem[];

/** Rutas que se miran por encima de cualquier empresa. */
const PLATFORM_PREFIXES = ADMINISTRATION_ITEMS.map((item) => item.href);

const COMPANY_HOME = '/prototype';
const PLATFORM_HOME = '/prototype/organizations';

function NavGroup({
  title,
  items,
  pathname,
  onNavigate,
}: {
  readonly title: string;
  readonly items: readonly NavItem[];
  readonly pathname: string;
  readonly onNavigate: () => void;
}): React.ReactElement {
  const copy = useCopy();

  return (
    <div className="px-3 py-2">
      <p className="text-text-muted px-3 pb-2 text-[0.6875rem] font-semibold tracking-wider uppercase">
        {title}
      </p>
      <ul className="space-y-0.5">
        {items.map((item) => {
          // El resumen vive en la raíz, así que solo coincide exacto. Las demás
          // secciones siguen marcadas mientras se navega dentro de ellas.
          const isActive =
            item.href === COMPANY_HOME
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href as never}
                onClick={onNavigate}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'rounded-control flex items-center gap-3 px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary-soft text-primary font-medium'
                    : 'text-text-muted hover:bg-surface-muted hover:text-text',
                ].join(' ')}
              >
                <item.Icon className="h-[1.125rem] w-[1.125rem] shrink-0" />
                <span className="truncate">{item.label(copy)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ContextSwitcher({
  isPlatformContext,
  company,
  onNavigate,
}: {
  readonly isPlatformContext: boolean;
  readonly company: Company | undefined;
  readonly onNavigate: () => void;
}): React.ReactElement {
  const copy = useCopy();

  if (isPlatformContext) {
    return (
      <Link
        href={COMPANY_HOME as never}
        onClick={onNavigate}
        className="border-border hover:bg-surface-muted rounded-control flex w-full items-center gap-3 border px-3 py-2 text-left transition-colors"
      >
        <span
          aria-hidden="true"
          className="bg-surface-muted rounded-control flex h-8 w-8 shrink-0 items-center justify-center"
        >
          <IconOrganizations className="text-text-muted h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{copy.admin.platform}</span>
          <span className="text-text-muted block text-xs">{copy.admin.platformHint}</span>
        </span>
        <IconChevronDown className="text-text-muted h-4 w-4 shrink-0" />
        <span className="sr-only">{copy.admin.enterCompany}</span>
      </Link>
    );
  }

  return (
    <Link
      href={PLATFORM_HOME as never}
      onClick={onNavigate}
      className="border-border hover:bg-surface-muted rounded-control flex w-full items-center gap-3 border px-3 py-2 text-left transition-colors"
    >
      <CountryFlag countryCode={company?.countryCode ?? ''} className="h-8 w-8" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{company?.name ?? ''}</span>
        <span className="text-text-muted block text-xs">
          {company?.countryCode} · {company?.currency}
        </span>
      </span>
      <IconChevronDown className="text-text-muted h-4 w-4 shrink-0" />
      <span className="sr-only">{copy.shell.switchCompany}</span>
    </Link>
  );
}

/**
 * Cuenta y cierre de sesión.
 *
 * El menú se abre hacia arriba porque el botón vive al fondo de la barra. Se
 * cierra con Escape devolviendo el foco, y con un clic fuera.
 *
 * Cerrar sesión en el prototipo solo lleva a la pantalla de acceso: no hay
 * sesión que invalidar. En la aplicación real esto borra la sesión en la base y
 * la cookie, de modo que el botón de atrás no devuelva a nadie adentro.
 */
function AccountMenu(): React.ReactElement {
  const copy = useCopy();

  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    function onPointerDown(event: MouseEvent): void {
      if (containerRef.current?.contains(event.target as Node) === true) return;
      setIsOpen(false);
    }

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      {isOpen ? (
        <div
          role="menu"
          aria-label={copy.shell.account}
          className="border-border bg-surface rounded-control absolute bottom-full left-0 z-50 mb-1 w-full border py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              router.push('/prototype/login' as never);
            }}
            className="text-danger hover:bg-danger-soft flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors"
          >
            <IconSignOut className="h-4 w-4 shrink-0" />
            {copy.admin.signOut}
          </button>
        </div>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        className="rounded-control hover:bg-surface-muted flex w-full items-center gap-3 px-2 py-2 text-left transition-colors"
      >
        <Avatar name={currentUser.name} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{currentUser.name}</span>
          <span className="text-text-muted block truncate text-xs">
            {currentUser.roleLabel}
          </span>
        </span>
        <IconChevronDown className="text-text-muted h-4 w-4 shrink-0" />
        <span className="sr-only">{copy.shell.account}</span>
      </button>
    </div>
  );
}

function Sidebar({
  pathname,
  onNavigate,
}: {
  readonly pathname: string;
  readonly onNavigate: () => void;
}): React.ReactElement {
  const copy = useCopy();

  const isPlatformContext = PLATFORM_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const { activeCompany } = useCompanyStore();

  return (
    <div className="bg-surface flex h-full flex-col">
      <div className="border-border border-b px-5 py-4">
        <p className="text-base font-semibold tracking-tight">{copy.app.name}</p>
      </div>

      <div className="border-border border-b p-3">
        <ContextSwitcher
          isPlatformContext={isPlatformContext}
          company={activeCompany}
          onNavigate={onNavigate}
        />
      </div>

      <nav
        aria-label={
          isPlatformContext ? copy.nav.sectionAdministration : copy.nav.sectionOperation
        }
        className="flex-1 overflow-y-auto py-2"
      >
        {isPlatformContext ? (
          <NavGroup
            title={copy.nav.sectionAdministration}
            items={ADMINISTRATION_ITEMS}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ) : (
          <>
            <NavGroup
              title={copy.nav.sectionOperation}
              items={OPERATION_ITEMS}
              pathname={pathname}
              onNavigate={onNavigate}
            />
            <div className="px-3 py-2">
              <Link
                href={PLATFORM_HOME as never}
                onClick={onNavigate}
                className="text-text-muted hover:bg-surface-muted hover:text-text rounded-control flex items-center gap-3 px-3 py-2 text-sm transition-colors"
              >
                <IconArrowLeft className="h-[1.125rem] w-[1.125rem] shrink-0" />
                <span className="truncate">{copy.admin.backToAdministration}</span>
              </Link>
            </div>
          </>
        )}
      </nav>

      <div className="border-border border-t p-3">
        <AccountMenu />
      </div>
    </div>
  );
}

export function AppShell({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  const copy = useCopy();

  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // El cajón se cierra con Escape, igual que cualquier capa superpuesta.
  useEffect(() => {
    if (!isDrawerOpen) return;
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') setIsDrawerOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isDrawerOpen]);

  function toggleTheme(): void {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.dataset['theme'] = next ? 'dark' : 'light';
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="border-border hidden border-r lg:sticky lg:top-0 lg:block lg:h-dvh">
        <Sidebar pathname={pathname} onNavigate={() => undefined} />
      </aside>

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={copy.shell.closeMenu}
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="border-border absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r shadow-xl">
            <Sidebar pathname={pathname} onNavigate={() => setIsDrawerOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-col">
        <header className="border-border bg-surface sticky top-0 z-40 flex h-14 items-center gap-2 border-b px-3 sm:px-4">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="rounded-control text-text-muted hover:bg-surface-muted hover:text-text p-2 transition-colors lg:hidden"
          >
            <IconMenu />
            <span className="sr-only">{copy.shell.openMenu}</span>
          </button>

          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <IconSearch className="text-text-muted pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input
              type="search"
              placeholder={copy.shell.searchPlaceholder}
              aria-label={copy.shell.search}
              className="border-border bg-canvas rounded-control placeholder:text-text-muted h-9 w-full border pr-3 pl-9 text-sm"
            />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-control text-text-muted hover:bg-surface-muted hover:text-text p-2 transition-colors"
            >
              {isDark ? <IconSun /> : <IconMoon />}
              <span className="sr-only">{copy.shell.switchTheme}</span>
            </button>
          </div>
        </header>

        <p className="border-border bg-warning-soft text-text-muted border-b px-4 py-1.5 text-center text-xs">
          {copy.app.prototypeNotice}
        </p>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

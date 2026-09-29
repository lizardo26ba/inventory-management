'use client';

/**
 * Marco de la aplicación.
 *
 * Es el gemelo real del marco del prototipo, con una diferencia que es la razón
 * de existir de este archivo: no sabe de dónde salen los datos. Recibe quién es
 * la persona, en qué contexto está y qué hacer al cerrar sesión. No importa
 * ningún almacén, ninguna consulta y ningún dato de ejemplo, así que se puede
 * montar en cualquier pantalla y probar sin levantar una base.
 *
 * La barra lateral enseña solo lo que existe. Un menú que promete pantallas sin
 * construir convierte cada clic en un error, y enseña peor el producto que un
 * menú corto que crece.
 *
 * Cambia con el contexto, como en el prototipo aprobado. En la plataforma se ve la
 * administración. Dentro de una empresa se ve su operación, y si se entró como
 * plataforma, además la salida de vuelta y una barra permanente que lo dice. ADR
 * 0005 y ADR 0013.
 *
 * En pantalla estrecha la barra se vuelve un cajón. Se cierra con Escape, con un
 * clic fuera y al navegar, porque dejarlo abierto encima de la pantalla a la que
 * se acaba de llegar obliga a cerrarlo a mano cada vez.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Avatar } from '@/components/ui/avatar';
import { CountryFlag } from '@/components/ui/flag';
import {
  IconArrowLeft,
  IconAudit,
  IconChevronDown,
  IconMenu,
  IconMoon,
  IconOrganizations,
  IconOverview,
  IconShield,
  IconSignOut,
  IconUsers,
  IconWarehouse,
  IconSun,
} from '@/components/ui/icons';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { NoticeBar } from '@/components/ui/notice-bar';
import { useCopy, type Copy } from '@/lib/i18n';

import { ADMINISTRATION_SECTIONS, OPERATION_SECTIONS, type NavSectionKey } from './navigation';

export type ShellUser = {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
};

/**
 * En qué está trabajando la persona. Sin empresa elegida se está por encima de
 * todas ellas, que es donde vive la administración de la plataforma.
 */
export type ShellContext =
  | { readonly kind: 'platform' }
  | {
      readonly kind: 'company';
      readonly name: string;
      readonly countryCode: string;
      readonly currencyCode: string;
      /** Si se entró como plataforma. Enciende la barra y la salida de vuelta. */
      readonly elevated: boolean;
      /**
       * A dónde lleva cambiar de empresa, para un miembro de varias. La plataforma
       * cambia saliendo, y quien tiene una sola no tiene a dónde, así que nulo.
       */
      readonly switchHref: string | null;
    };

/** Cómo se sale de la empresa. Es una acción de servidor que rota la sesión. */
type LeaveCompany = () => Promise<void>;

/**
 * Cómo se dibuja cada sección.
 *
 * El rótulo se pide con el catálogo del momento en lugar de guardarse ya
 * resuelto: esto se declara una vez al cargar el módulo y el idioma puede
 * cambiar muchas veces después.
 *
 * Qué secciones hay y qué permiso abre cada una no está aquí, sino en
 * `navigation.ts`, porque eso lo lee también el servidor. Aquí solo el dibujo.
 */
const SECTION_PRESENTATION: Record<
  NavSectionKey,
  {
    readonly label: (copy: Copy) => string;
    readonly Icon: (props: { readonly className?: string }) => React.ReactElement;
  }
> = {
  overview: { label: (copy) => copy.nav.overview, Icon: IconOverview },
  warehouses: { label: (copy) => copy.nav.warehouses, Icon: IconWarehouse },
  organizations: { label: (copy) => copy.nav.organizations, Icon: IconOrganizations },
  users: { label: (copy) => copy.nav.users, Icon: IconUsers },
  audit: { label: (copy) => copy.nav.audit, Icon: IconAudit },
};

type NavItem = {
  readonly href: string;
  readonly label: (copy: Copy) => string;
  readonly Icon: (props: { readonly className?: string }) => React.ReactElement;
};

/** Junta lo que la sección es con cómo se ve, y deja fuera lo que no se alcanza. */
function navItemsFor(sections: readonly NavSectionKey[]): readonly NavItem[] {
  return [...OPERATION_SECTIONS, ...ADMINISTRATION_SECTIONS]
    .filter((section) => sections.includes(section.key))
    .map((section) => ({ href: section.href, ...SECTION_PRESENTATION[section.key] }));
}

/** La portada vive en la raíz, así que solo coincide exacta. */
const HOME_HREF = '/';

/**
 * El botón de salir de la empresa, deshabilitado mientras la sesión rota. Va
 * dentro del formulario que lo envía, que es de donde lee si está en curso.
 */
function LeaveCompanyButton({
  className,
  children,
}: {
  readonly className: string;
  readonly children: React.ReactNode;
}): React.ReactElement {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={className}>
      {children}
    </button>
  );
}

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
          const isActive =
            item.href === HOME_HREF ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
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

/**
 * Dice en qué contexto se está y, si se puede, lleva a cambiarlo.
 *
 * La plataforma entra a una empresa eligiéndola en su lista (RN-004), así que en
 * la plataforma esto solo informa. Dentro de una empresa, un miembro de varias
 * vuelve a su selector y la plataforma sale; quien tiene una sola no tiene a
 * dónde ir, y no se le dibuja algo que parezca pulsable.
 */
function ContextSwitcher({
  context,
  leaveCompany,
}: {
  readonly context: ShellContext;
  readonly leaveCompany: LeaveCompany;
}): React.ReactElement {
  const copy = useCopy();

  if (context.kind === 'platform') {
    return (
      <div className="border-border rounded-control flex w-full items-center gap-3 border px-3 py-2">
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
      </div>
    );
  }

  const identity = (
    <>
      <CountryFlag countryCode={context.countryCode} className="h-8 w-8" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{context.name}</span>
        <span className="text-text-muted block text-xs">
          {context.countryCode} · {context.currencyCode}
        </span>
      </span>
    </>
  );
  const switchable =
    'border-border hover:bg-surface-muted rounded-control flex w-full items-center gap-3 border px-3 py-2 text-left transition-colors disabled:opacity-60';
  const chevron = (
    <>
      <IconChevronDown className="text-text-muted h-4 w-4 shrink-0" />
      <span className="sr-only">{copy.shell.switchCompany}</span>
    </>
  );

  if (context.elevated) {
    return (
      <form action={leaveCompany}>
        <LeaveCompanyButton className={switchable}>
          {identity}
          {chevron}
        </LeaveCompanyButton>
      </form>
    );
  }

  if (context.switchHref !== null) {
    return (
      <Link href={context.switchHref} className={switchable}>
        {identity}
        {chevron}
      </Link>
    );
  }

  return (
    <div className="border-border rounded-control flex w-full items-center gap-3 border px-3 py-2">
      {identity}
    </div>
  );
}

/**
 * Cuenta y cierre de sesión.
 *
 * El menú se abre hacia arriba porque el botón vive al fondo de la barra, se
 * cierra con Escape devolviendo el foco y con un clic fuera.
 *
 * Cerrar sesión es una acción de servidor: borra la sesión en la base y la
 * cookie, de modo que el botón de atrás no devuelva a nadie adentro.
 */
function AccountMenu({
  user,
  signOut,
}: {
  readonly user: ShellUser;
  readonly signOut: () => Promise<void>;
}): React.ReactElement {
  const copy = useCopy();
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

  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <div ref={containerRef} className="relative">
      {isOpen ? (
        <div
          role="menu"
          aria-label={copy.shell.account}
          className="border-border bg-surface rounded-control absolute bottom-full left-0 z-50 mb-1 w-full border py-1 shadow-lg"
        >
          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="text-danger hover:bg-danger-soft flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors"
            >
              <IconSignOut className="h-4 w-4 shrink-0" />
              {copy.admin.signOut}
            </button>
          </form>
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
        <Avatar name={fullName} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{fullName}</span>
          <span className="text-text-muted block truncate text-xs">{user.email}</span>
        </span>
        <IconChevronDown className="text-text-muted h-4 w-4 shrink-0" />
        <span className="sr-only">{copy.shell.account}</span>
      </button>
    </div>
  );
}

function Sidebar({
  user,
  context,
  signOut,
  leaveCompany,
  pathname,
  sections,
  onNavigate,
}: {
  readonly user: ShellUser;
  readonly context: ShellContext;
  readonly signOut: () => Promise<void>;
  readonly leaveCompany: LeaveCompany;
  readonly pathname: string;
  readonly sections: readonly NavSectionKey[];
  readonly onNavigate: () => void;
}): React.ReactElement {
  const copy = useCopy();
  const items = navItemsFor(sections);
  const inCompany = context.kind === 'company';
  const groupTitle = inCompany ? copy.nav.sectionOperation : copy.nav.sectionAdministration;

  return (
    <div className="bg-surface flex h-full flex-col">
      <div className="border-border border-b px-5 py-4">
        <p className="text-base font-semibold tracking-tight">{copy.app.name}</p>
      </div>

      <div className="border-border border-b p-3">
        <ContextSwitcher context={context} leaveCompany={leaveCompany} />
      </div>

      {/*
        Sin ninguna sección alcanzable no se dibuja el rótulo del grupo ni la
        región de navegación: un encabezado que no encabeza nada solo lo anuncia
        un lector de pantalla, y anuncia un vacío. El hueco se conserva para que
        la cuenta siga al fondo.
      */}
      {items.length > 0 ? (
        <nav aria-label={groupTitle} className="flex-1 overflow-y-auto py-2">
          <NavGroup
            title={groupTitle}
            items={items}
            pathname={pathname}
            onNavigate={onNavigate}
          />

          {/* Solo la plataforma tiene una administración a la que volver, y volver
              es salir de la empresa. */}
          {context.kind === 'company' && context.elevated ? (
            <form action={leaveCompany} className="px-3 py-2">
              <LeaveCompanyButton className="text-text-muted hover:bg-surface-muted hover:text-text rounded-control flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors disabled:opacity-60">
                <IconArrowLeft className="h-[1.125rem] w-[1.125rem] shrink-0" />
                <span className="truncate">{copy.admin.backToAdministration}</span>
              </LeaveCompanyButton>
            </form>
          ) : null}
        </nav>
      ) : (
        <div className="flex-1" />
      )}

      <div className="border-border border-t p-3">
        <AccountMenu user={user} signOut={signOut} />
      </div>
    </div>
  );
}

export function AppShell({
  user,
  context,
  signOut,
  leaveCompany,
  sections,
  children,
}: {
  readonly user: ShellUser;
  readonly context: ShellContext;
  readonly signOut: () => Promise<void>;
  readonly leaveCompany: LeaveCompany;
  /** Las secciones que esta persona alcanza. Las decide el servidor. */
  readonly sections: readonly NavSectionKey[];
  readonly children: React.ReactNode;
}): React.ReactElement {
  const copy = useCopy();
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

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
        <Sidebar
          user={user}
          context={context}
          signOut={signOut}
          leaveCompany={leaveCompany}
          pathname={pathname}
          sections={sections}
          onNavigate={() => undefined}
        />
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
            <Sidebar
              user={user}
              context={context}
              signOut={signOut}
              leaveCompany={leaveCompany}
              pathname={pathname}
              sections={sections}
              onNavigate={() => setIsDrawerOpen(false)}
            />
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

        {/* El distintivo permanente del ADR 0005: mientras la plataforma esté
            dentro de una empresa, cada pantalla lo dice y ofrece la salida. */}
        {context.kind === 'company' && context.elevated ? (
          <NoticeBar
            tone="danger"
            icon={<IconShield className="text-danger h-4 w-4 shrink-0" />}
            action={
              <form action={leaveCompany}>
                <LeaveCompanyButton className="text-danger font-medium underline-offset-4 hover:underline disabled:opacity-60">
                  {copy.elevatedAccess.leave}
                </LeaveCompanyButton>
              </form>
            }
          >
            {copy.elevatedAccess.actingIn} <strong>{context.name}</strong>{' '}
            {copy.elevatedAccess.asPlatform}
          </NoticeBar>
        ) : null}

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

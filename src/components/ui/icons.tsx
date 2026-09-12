/**
 * Iconos propios.
 *
 * El proyecto no usa bibliotecas de interfaz externas, así que los iconos son
 * SVG escritos aquí. Todos comparten la misma rejilla, el mismo grosor de trazo
 * y heredan el color del texto, de modo que encajan en cualquier superficie sin
 * ajustes.
 *
 * Son decorativos: el significado siempre lo lleva el texto que los acompaña.
 * Por eso van marcados como ocultos para lectores de pantalla.
 */

type IconProps = {
  readonly className?: string;
};

const STROKE_ATTRIBUTES = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function Svg({
  className,
  children,
}: IconProps & { readonly children: React.ReactNode }): React.ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? 'h-5 w-5'}
      aria-hidden="true"
      focusable="false"
      {...STROKE_ATTRIBUTES}
    >
      {children}
    </svg>
  );
}

export function IconOverview(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="7" height="8" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="11" width="7" height="10" rx="1.5" />
    </Svg>
  );
}

export function IconProducts(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <path d="M20.5 7.5 12 3 3.5 7.5v9L12 21l8.5-4.5z" />
      <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
    </Svg>
  );
}

export function IconStock(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <path d="M3 7h18M3 12h18M3 17h18" />
      <path d="M8 4v3M16 9v3M11 14v3" />
    </Svg>
  );
}

export function IconWarehouse(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <path d="M3 10 12 4l9 6v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <path d="M8 21v-7h8v7" />
    </Svg>
  );
}

export function IconPurchases(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <path d="M3 4h2l2.2 10.4a1.5 1.5 0 0 0 1.5 1.2h7.8a1.5 1.5 0 0 0 1.5-1.2L20 7H6" />
      <circle cx="9.5" cy="19.5" r="1.3" />
      <circle cx="17" cy="19.5" r="1.3" />
    </Svg>
  );
}

export function IconSales(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <path d="M3 17.5 9 11l4 3.5L21 6" />
      <path d="M15 6h6v6" />
    </Svg>
  );
}

export function IconOrganizations(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <path d="M4 21V6a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15" />
      <path d="M13 10h6a1 1 0 0 1 1 1v10" />
      <path d="M7 9h3M7 13h3M7 17h3M16 14h1M16 18h1" />
      <path d="M2.5 21h19" />
    </Svg>
  );
}

export function IconUsers(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8M17.5 20a5.8 5.8 0 0 0-2-4.2" />
    </Svg>
  );
}

export function IconAudit(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v4h4" />
      <path d="M8.5 13h7M8.5 17h4" />
    </Svg>
  );
}

export function IconSearch(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.3-4.3" />
    </Svg>
  );
}

export function IconPlus(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconFilter(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <path d="M3 5h18l-7 8v6l-4 2v-8z" />
    </Svg>
  );
}

export function IconChevronDown(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

/** Saltar a la primera página: la flecha choca contra el tope. */
export function IconFirstPage(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <path d="m17 6-6 6 6 6M8 6v12" />
    </Svg>
  );
}

/** Saltar a la última página. */
export function IconLastPage(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <path d="m7 6 6 6-6 6M16 6v12" />
    </Svg>
  );
}

export function IconMenu(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}

export function IconClose(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Svg>
  );
}

export function IconSun(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Svg>
  );
}

export function IconMoon(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <path d="M20 14.5A8.2 8.2 0 0 1 9.5 4 8.3 8.3 0 1 0 20 14.5z" />
    </Svg>
  );
}

export function IconLanguage(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </Svg>
  );
}

export function IconAlert(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <path d="M12 4.5 2.8 20h18.4z" />
      <path d="M12 10v4M12 17h.01" />
    </Svg>
  );
}

export function IconLock(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </Svg>
  );
}

export function IconMore(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <circle cx="12" cy="5" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="12" cy="19" r="1.2" />
    </Svg>
  );
}

export function IconEye(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

export function IconPencil(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z" />
      <path d="m14.5 7.5 2 2" />
    </Svg>
  );
}

export function IconTrash(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <path d="M4 7h16M10 7V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2" />
      <path d="M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7" />
      <path d="M10 11v6M14 11v6" />
    </Svg>
  );
}

export function IconArrowLeft(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Svg>
  );
}

export function IconSortNone(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <path d="m8 9 4-4 4 4M8 15l4 4 4-4" />
    </Svg>
  );
}

export function IconSortAsc(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <path d="m6 14 6-6 6 6" />
    </Svg>
  );
}

export function IconSortDesc(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <path d="m6 10 6 6 6-6" />
    </Svg>
  );
}

export function IconSignOut(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" />
      <path d="M10 8 6 12l4 4M6 12h9" />
    </Svg>
  );
}

export function IconShield(props: IconProps): React.ReactElement {
  return (
    <Svg {...props}>
      <path d="M12 3 5 6v6c0 4.2 2.9 7.9 7 9 4.1-1.1 7-4.8 7-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </Svg>
  );
}

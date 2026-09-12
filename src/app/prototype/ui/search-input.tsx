'use client';

/**
 * Buscador de la tabla de empresas.
 *
 * El texto buscado vive en la dirección, no en el estado del componente. Esa es
 * la jerarquía de estado que manda CLAUDE.md: si algo debe sobrevivir a una
 * recarga y poder compartirse por enlace, va en la dirección.
 *
 * A cambio, quien filtra y pagina es el servidor. El componente solo escribe el
 * parámetro y deja que la página se vuelva a renderizar.
 *
 * Escribe con retardo porque cada pulsación provocaría una navegación. Y vuelve
 * a la primera página en cada búsqueda nueva: quedarse en la página cuatro de un
 * resultado que ahora tiene una sola página deja la tabla vacía sin motivo.
 *
 * Ese retardo es tiempo en el que lo escrito y lo que muestra la tabla no
 * coinciden. Se declara como fuente de carga para que la barra de la cabecera
 * se encienda desde la primera pulsación y no solo cuando arranca la consulta.
 */

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useCopy } from '@/lib/i18n';
import { IconClose, IconSearch } from './icons';
import { useLoadingSource } from './table-loading';

const DEBOUNCE_MS = 300;

export function SearchInput({
  placeholder,
}: {
  readonly placeholder: string;
}): React.ReactElement {
  const copy = useCopy();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const queryFromUrl = searchParams.get('q') ?? '';
  const [value, setValue] = useState(queryFromUrl);
  const isFirstRender = useRef(true);

  // Si la dirección cambia por otra vía, por ejemplo el botón de atrás, el
  // campo tiene que seguirla.
  useEffect(() => {
    setValue(queryFromUrl);
  }, [queryFromUrl]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (value === queryFromUrl) return;

    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim() === '') {
        params.delete('q');
      } else {
        params.set('q', value);
      }
      params.delete('page');
      const query = params.toString();
      router.replace((query === '' ? pathname : `${pathname}?${query}`) as never, {
        scroll: false,
      });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [value, queryFromUrl, pathname, router, searchParams]);

  useLoadingSource('search-debounce', value.trim() !== queryFromUrl.trim());

  return (
    <div className="relative min-w-0 flex-1 sm:max-w-xs">
      <IconSearch className="text-text-muted pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
      {/* El botón de limpiar es propio, así que se oculta el que el navegador
          añade por su cuenta: dos cruces seguidas confunden. */}
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="border-border bg-canvas rounded-control placeholder:text-text-muted h-9 w-full border pr-9 pl-9 text-sm [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value !== '' ? (
        <button
          type="button"
          onClick={() => setValue('')}
          className="text-text-muted hover:text-text absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1"
        >
          <IconClose className="h-3.5 w-3.5" />
          <span className="sr-only">{copy.organizations.clearSearch}</span>
        </button>
      ) : null}
    </div>
  );
}

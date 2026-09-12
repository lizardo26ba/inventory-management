'use client';

/**
 * Selector de país con bandera.
 *
 * El desplegable nativo del navegador no admite imágenes dentro de sus
 * opciones, así que hay que escribirlo a mano. Eso obliga a reponer lo que el
 * nativo daba gratis:
 *
 * - Se abre con Enter, con la barra espaciadora o con las flechas.
 * - Las flechas recorren las opciones, Inicio y Fin saltan a los extremos.
 * - Enter elige, Escape cierra sin cambiar nada y devuelve el foco al botón.
 * - Un clic fuera cierra.
 * - El país elegido se anuncia por su nombre, no por su bandera: el color no
 *   puede ser el único portador del significado.
 *
 * Los países llegan por propiedad y no se leen aquí: este componente vive en las
 * primitivas compartidas y no puede saber de dónde salen, si del catálogo de la
 * base o de datos de prueba.
 */

import { useEffect, useId, useRef, useState } from 'react';

import { CountryFlag } from './flag';
import { IconChevronDown } from './icons';

/** Lo mínimo que el selector necesita de un país para pintarlo. */
export type CountryChoice = {
  readonly code: string;
  readonly name: string;
  readonly phonePrefix: string;
};

export function CountrySelect({
  id,
  value,
  options,
  onChange,
}: {
  readonly id: string;
  readonly value: string;
  readonly options: readonly CountryChoice[];
  readonly onChange: (countryCode: string) => void;
}): React.ReactElement {
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.code === value);

  useEffect(() => {
    if (!isOpen) return;

    function onPointerDown(event: MouseEvent): void {
      if (containerRef.current?.contains(event.target as Node) === true) return;
      setIsOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isOpen]);

  // Al abrir, el foco salta a la opción ya elegida, que es donde la persona
  // espera estar para moverse con las flechas.
  useEffect(() => {
    if (!isOpen) return;
    const current = listRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    const first = listRef.current?.querySelector<HTMLButtonElement>('[role="option"]');
    (current ?? first)?.focus({ preventScroll: true });
  }, [isOpen]);

  function choose(countryCode: string): void {
    onChange(countryCode);
    setIsOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  }

  function onTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
    }
  }

  function onListKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
      return;
    }

    const items = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [],
    );
    if (items.length === 0) return;

    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = (currentIndex + step + items.length) % items.length;
      items[nextIndex]?.focus({ preventScroll: true });
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      items[0]?.focus({ preventScroll: true });
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      items[items.length - 1]?.focus({ preventScroll: true });
    }
  }

  return (
    <div ref={containerRef} className="relative mt-1.5">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        onKeyDown={onTriggerKeyDown}
        onClick={() => setIsOpen((open) => !open)}
        className="border-border bg-surface rounded-control hover:bg-surface-muted flex h-10 w-full items-center gap-2.5 border px-3 text-left text-sm transition-colors"
      >
        <CountryFlag countryCode={value} className="h-5 w-5" />
        <span className="flex-1 truncate">{selected?.name ?? value}</span>
        <IconChevronDown className="text-text-muted h-4 w-4 shrink-0" />
      </button>

      {isOpen ? (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={selected?.name ?? value}
          onKeyDown={onListKeyDown}
          className="border-border bg-surface rounded-control absolute top-full left-0 z-50 mt-1 w-full border py-1 shadow-lg"
        >
          {options.map((option) => {
            const isSelected = option.code === value;
            return (
              <button
                key={option.code}
                type="button"
                role="option"
                aria-selected={isSelected}
                tabIndex={-1}
                onClick={() => choose(option.code)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                  isSelected ? 'bg-primary-soft text-primary' : 'hover:bg-surface-muted'
                }`}
              >
                <CountryFlag countryCode={option.code} className="h-5 w-5" />
                <span className="flex-1 truncate">{option.name}</span>
                <span className="text-text-muted text-xs">{option.phonePrefix}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

'use client';

/**
 * Selector de idioma.
 *
 * Es un desplegable y no un botón que alterna. Con dos idiomas alternar bastaba,
 * pero un selector enseña de una vez qué idiomas hay y cuál está puesto, y no
 * cambia nada al equivocarse de clic: se abre, se mira y se cierra. Cuando entre
 * un tercer idioma, esta pantalla no cambia.
 *
 * El desplegable nativo del navegador no admite imágenes dentro de sus opciones,
 * así que está escrito a mano, con las mismas reglas que el selector de país:
 *
 * - Se abre con Enter, con la barra espaciadora o con las flechas.
 * - Las flechas recorren, Inicio y Fin saltan a los extremos.
 * - Enter elige, Escape cierra sin cambiar nada y devuelve el foco al botón.
 * - Un clic fuera cierra.
 * - Cada idioma se nombra en su propio idioma y lleva el atributo lang, para que
 *   un lector de pantalla lo pronuncie con la voz correcta. La bandera no es lo
 *   que lo identifica: es lo que lo hace reconocible de lejos.
 *
 * En el encabezado solo cabe la bandera y las dos letras. El nombre completo
 * vive en la lista, que es donde se elige.
 */

import { useEffect, useId, useRef, useState } from 'react';

import { CountryFlag } from './flag';
import { IconChevronDown } from './icons';
import { LANGUAGES, useCopy, useLanguage, type LanguageCode } from '@/lib/i18n';

export function LanguageSwitcher(): React.ReactElement {
  const copy = useCopy();
  const { language, setLanguage, isSwitching } = useLanguage();

  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((option) => option.code === language) ?? LANGUAGES[0];

  useEffect(() => {
    if (!isOpen) return;

    function onPointerDown(event: MouseEvent): void {
      if (containerRef.current?.contains(event.target as Node) === true) return;
      setIsOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isOpen]);

  // Al abrir, el foco salta al idioma puesto, que es desde donde se quiere
  // recorrer con las flechas.
  useEffect(() => {
    if (!isOpen) return;
    const selected =
      listRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    const first = listRef.current?.querySelector<HTMLButtonElement>('[role="option"]');
    (selected ?? first)?.focus({ preventScroll: true });
  }, [isOpen]);

  function choose(code: LanguageCode): void {
    setIsOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
    setLanguage(code);
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

    const options = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [],
    );
    if (options.length === 0) return;

    const currentIndex = options.indexOf(document.activeElement as HTMLButtonElement);

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = (currentIndex + step + options.length) % options.length;
      options[nextIndex]?.focus({ preventScroll: true });
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      options[0]?.focus({ preventScroll: true });
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      options[options.length - 1]?.focus({ preventScroll: true });
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listId : undefined}
        aria-label={`${copy.shell.switchLanguage}: ${current.name}`}
        disabled={isSwitching}
        onKeyDown={onTriggerKeyDown}
        onClick={() => setIsOpen((open) => !open)}
        className="rounded-control text-text-muted hover:bg-surface-muted hover:text-text inline-flex items-center gap-1.5 px-2 py-2 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        <CountryFlag countryCode={current.flagCountry} className="h-5 w-5" />
        <span aria-hidden="true" className="text-xs font-semibold tracking-wide">
          {current.short}
        </span>
        <IconChevronDown className="h-4 w-4 shrink-0" />
      </button>

      {isOpen ? (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={copy.shell.switchLanguage}
          onKeyDown={onListKeyDown}
          className="border-border bg-surface rounded-control absolute top-full right-0 z-50 mt-1 w-44 border py-1 shadow-lg"
        >
          {LANGUAGES.map((option) => {
            const isSelected = option.code === language;
            return (
              <button
                key={option.code}
                type="button"
                role="option"
                lang={option.code}
                aria-selected={isSelected}
                tabIndex={-1}
                onClick={() => choose(option.code)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                  isSelected ? 'bg-primary-soft text-primary' : 'hover:bg-surface-muted'
                }`}
              >
                <CountryFlag countryCode={option.flagCountry} className="h-5 w-5" />
                <span className="flex-1 truncate">{option.name}</span>
                <span className="text-text-muted text-xs">{option.short}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

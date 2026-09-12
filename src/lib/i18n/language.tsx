'use client';

/**
 * Idioma de la interfaz.
 *
 * Dos idiomas por ahora, inglés por defecto. La elección se recuerda en el
 * navegador, así que quien eligió español no vuelve a elegirlo en cada visita.
 *
 * El cambio no recarga la página. Recargar pierde lo que estaba escrito a medias
 * en un formulario, el desplazamiento y la fila que se estaba mirando, y a
 * cambio no aporta nada: los textos ya están los dos en el navegador.
 *
 * A cambio hay que cuidar la transición, porque cambiar cada palabra de golpe es
 * un parpadeo desagradable y además hace saltar la altura de los bloques cuando
 * una frase mide distinto en el otro idioma. Por eso el contenido se desvanece,
 * se cambia el idioma mientras está invisible, y vuelve. Son dos décimas de
 * segundo: lo justo para que el ojo lea el cambio como una transición y no como
 * un fallo.
 *
 * Al entrar, el idioma lo resuelve el servidor leyendo una cookie, y llega ya
 * elegido a la primera pintura. Antes se resolvía en el navegador y el contenido
 * nacía invisible hasta que ese código corría: cualquier tropiezo del JavaScript
 * dejaba la aplicación entera en blanco, con el texto presente pero transparente.
 * Una página servida desde el servidor tiene que verse por sí sola.
 *
 * Por eso se guarda en cookie y no solo en el almacén del navegador: el almacén
 * el servidor no lo puede leer.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { copyEn, type Copy } from './copy';
import { copyEs } from './copy-es';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE_MAX_AGE_SECONDS,
  LANGUAGE_COOKIE_NAME,
  type LanguageCode,
} from './languages';

const CATALOGUES: Record<LanguageCode, Copy> = {
  en: copyEn,
  es: copyEs,
};

const STORAGE_KEY = 'inventario.language';

/** Lo que dura el desvanecido. Debe coincidir con la clase duration de abajo. */
const FADE_MS = 180;

type LanguageState = {
  readonly language: LanguageCode;
  readonly copy: Copy;
  readonly setLanguage: (next: LanguageCode) => void;
  /** Cierto mientras dura la transición, para que nadie la dispare dos veces. */
  readonly isSwitching: boolean;
};

const LanguageContext = createContext<LanguageState | null>(null);

export function LanguageProvider({
  children,
  initialLanguage = DEFAULT_LANGUAGE,
}: {
  readonly children: React.ReactNode;
  /** El idioma que el servidor ya resolvió leyendo la cookie. */
  readonly initialLanguage?: LanguageCode;
}): React.ReactElement {
  const [language, setLanguageValue] = useState<LanguageCode>(initialLanguage);
  const [isSwitching, setIsSwitching] = useState(false);

  // El idioma del documento no es un adorno: de él dependen la separación
  // silábica, las comillas y la voz que usa un lector de pantalla.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback(
    (next: LanguageCode) => {
      if (next === language || isSwitching) return;

      window.localStorage.setItem(STORAGE_KEY, next);
      // La cookie es la que hace que la próxima visita llegue ya en el idioma
      // correcto desde el servidor, sin destello.
      document.cookie = `${LANGUAGE_COOKIE_NAME}=${next}; path=/; max-age=${String(LANGUAGE_COOKIE_MAX_AGE_SECONDS)}; samesite=lax`;
      setIsSwitching(true);
      // El idioma se cambia con el contenido ya invisible. Cambiarlo antes
      // dejaría ver el texto nuevo entrando mientras el viejo todavía se va.
      window.setTimeout(() => {
        setLanguageValue(next);
        setIsSwitching(false);
      }, FADE_MS);
    },
    [language, isSwitching],
  );

  const value = useMemo(
    () => ({ language, copy: CATALOGUES[language], setLanguage, isSwitching }),
    [language, setLanguage, isSwitching],
  );

  return (
    <LanguageContext.Provider value={value}>
      {/* El contenido nunca nace invisible: solo se atenúa durante un cambio de
          idioma deliberado. Quien pidió menos movimiento en su sistema no ve el
          desvanecido, porque la regla global deja la transición en cero. */}
      <div
        className={`transition-opacity duration-[180ms] ${isSwitching ? 'opacity-0' : 'opacity-100'}`}
      >
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

function useLanguageState(): LanguageState {
  const state = useContext(LanguageContext);
  if (state === null) {
    throw new Error('useCopy necesita estar dentro de LanguageProvider.');
  }
  return state;
}

/** Los textos del idioma elegido. Es la única forma de leer un texto. */
export function useCopy(): Copy {
  return useLanguageState().copy;
}

export function useLanguage(): Omit<LanguageState, 'copy'> {
  const { language, setLanguage, isSwitching } = useLanguageState();
  return { language, setLanguage, isSwitching };
}

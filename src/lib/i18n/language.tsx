'use client';

/**
 * Idioma de la interfaz.
 *
 * Dos idiomas por ahora, inglés por defecto. La elección se recuerda en el
 * navegador, así que quien eligió español no vuelve a elegirlo en cada visita.
 *
 * El cambio no recarga la página. Recargar pierde lo que estaba escrito a medias
 * en un formulario, el desplazamiento y la fila que se estaba mirando.
 *
 * Pero no todo el texto vive en el navegador. La mayor parte de las pantallas se
 * pinta en el servidor, y allí el idioma sale de la cookie en el momento de
 * pintar, no de este contexto. Cambiar la cookie no vuelve a pintar nada por sí
 * solo, así que el cambio pide además un refresco de servidor. Sin él, los
 * títulos, las cabeceras de tabla y las fichas se quedaban en el idioma viejo
 * hasta que alguien recargaba, y solo cambiaban los textos de los componentes de
 * cliente.
 *
 * A cambio hay que cuidar la transición, porque cambiar cada palabra de golpe es
 * un parpadeo desagradable y además hace saltar la altura de los bloques cuando
 * una frase mide distinto en el otro idioma. Por eso el contenido se desvanece,
 * se cambia el idioma mientras está invisible, y vuelve. Son dos décimas de
 * segundo: lo justo para que el ojo lea el cambio como una transición y no como
 * un fallo.
 *
 * El desvanecido dura además lo que tarde el refresco del servidor. Eso no es
 * adorno: es lo que impide ver media pantalla en un idioma y media en el otro
 * mientras el servidor contesta.
 *
 * Al entrar, el idioma lo resuelve el servidor leyendo una cookie, y llega ya
 * elegido a la primera pintura. Antes se resolvía en el navegador y el contenido
 * nacía invisible hasta que ese código corría: cualquier tropiezo del JavaScript
 * dejaba la aplicación entera en blanco, con el texto presente pero transparente.
 * Una página servida desde el servidor tiene que verse por sí sola.
 *
 * Se guarda en cookie y no en el almacén del navegador, que el servidor no
 * puede leer. Antes se escribían los dos y nadie leía el segundo.
 */

import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';

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
  const [isFading, setIsFading] = useState(false);

  const router = useRouter();
  // El refresco de servidor dentro de una transición avisa cuándo termina. Es lo
  // único que sabe si el texto del servidor ya llegó en el idioma nuevo.
  const [isRefreshing, startRefresh] = useTransition();
  const fadeTimeoutRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (fadeTimeoutRef.current !== null) window.clearTimeout(fadeTimeoutRef.current);
    },
    [],
  );

  // Invisible mientras dura el desvanecido y mientras el servidor conteste.
  const isSwitching = isFading || isRefreshing;

  // El idioma del documento no es un adorno: de él dependen la separación
  // silábica, las comillas y la voz que usa un lector de pantalla.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback(
    (next: LanguageCode) => {
      if (next === language || isSwitching) return;

      // La cookie manda dos veces: hace que la próxima visita llegue ya en el
      // idioma correcto, y es lo que lee el servidor en el refresco de abajo.
      document.cookie = `${LANGUAGE_COOKIE_NAME}=${next}; path=/; max-age=${String(LANGUAGE_COOKIE_MAX_AGE_SECONDS)}; samesite=lax`;
      setIsFading(true);
      // El idioma se cambia con el contenido ya invisible. Cambiarlo antes
      // dejaría ver el texto nuevo entrando mientras el viejo todavía se va.
      fadeTimeoutRef.current = window.setTimeout(() => {
        setLanguageValue(next);
        // Las dos orillas a la vez: el contexto atiende a los componentes de
        // cliente y el refresco vuelve a pedir al servidor los suyos, que ahora
        // leerán la cookie nueva. Se conserva lo escrito en los formularios,
        // porque refrescar no es recargar.
        startRefresh(() => {
          router.refresh();
        });
        setIsFading(false);
      }, FADE_MS);
    },
    [language, isSwitching, router],
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

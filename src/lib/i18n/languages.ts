/**
 * Los idiomas que se ofrecen, y nada más.
 *
 * Es un módulo sin marca de cliente a propósito. La lista y sus ayudantes los
 * necesitan las dos orillas: el servidor para resolver el idioma leyendo la
 * cookie antes de pintar, y el navegador para dibujar el selector. Una función
 * declarada dentro de un módulo de cliente no se puede llamar desde el servidor,
 * así que lo compartido vive aquí y el proveedor se queda solo con lo que de
 * verdad necesita ejecutarse en el navegador.
 *
 * La bandera es la del país que se toma como referencia del idioma, no la del
 * país de quien mira: Estados Unidos para el inglés y España para el español. Es
 * una convención discutible, y por eso la bandera nunca va sola: al lado siempre
 * está el nombre del idioma escrito en ese mismo idioma.
 */

export const LANGUAGES = [
  { code: 'en', name: 'English', short: 'EN', flagCountry: 'US' },
  { code: 'es', name: 'Español', short: 'ES', flagCountry: 'ES' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

/** Inglés. El sistema se enseña a gente de varios países. */
export const DEFAULT_LANGUAGE: LanguageCode = 'en';

/**
 * La elección, en una cookie que el servidor sí puede leer. No es sensible ni
 * identifica a nadie, así que no necesita ser inaccesible al script: al
 * contrario, es el navegador quien la escribe.
 */
export const LANGUAGE_COOKIE_NAME = 'language';

export const LANGUAGE_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export function isLanguageCode(value: string | null | undefined): value is LanguageCode {
  return LANGUAGES.some((language) => language.code === value);
}

/** El idioma de una cookie, o el de partida si no hay o no vale. */
export function resolveLanguage(value: string | null | undefined): LanguageCode {
  return isLanguageCode(value) ? value : DEFAULT_LANGUAGE;
}

/**
 * Idioma de la interfaz.
 *
 * Puerta única del módulo. El resto del proyecto pide los textos por aquí y no
 * conoce la forma interna del catálogo, así que partirlo por dominio más
 * adelante no obliga a tocar ninguna pantalla.
 */

export { copyEn, type Copy } from './copy';
export { copyEs } from './copy-es';
export { LanguageProvider, useCopy, useLanguage } from './language';
export {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  LANGUAGE_COOKIE_NAME,
  isLanguageCode,
  resolveLanguage,
  type LanguageCode,
} from './languages';

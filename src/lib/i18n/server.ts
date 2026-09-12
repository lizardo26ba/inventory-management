import 'server-only';

/**
 * Los textos, desde el servidor.
 *
 * El gancho `useCopy` solo sirve en el navegador, y la mayor parte de este
 * producto se pinta en el servidor. Sin esta puerta, cada pantalla tendría que
 * volverse de cliente solo para poder escribir un título, que es exactamente lo
 * que el principio 5 de CLAUDE.md quiere evitar.
 *
 * Lee la misma cookie que el marco raíz, así que las dos orillas hablan el mismo
 * idioma en la misma pintura.
 */

import { cookies } from 'next/headers';

import { copyEn, type Copy } from './copy';
import { copyEs } from './copy-es';
import { LANGUAGE_COOKIE_NAME, resolveLanguage } from './languages';

const CATALOGUES: Record<string, Copy> = { en: copyEn, es: copyEs };

export async function getCopy(): Promise<Copy> {
  const store = await cookies();
  const language = resolveLanguage(store.get(LANGUAGE_COOKIE_NAME)?.value);
  return CATALOGUES[language] ?? copyEn;
}

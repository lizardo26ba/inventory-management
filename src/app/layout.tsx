import type { Metadata, Viewport } from 'next';

import { cookies } from 'next/headers';

import './globals.css';
import { LANGUAGE_COOKIE_NAME, LanguageProvider, resolveLanguage } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Inventario',
  description: 'Sistema de control de inventarios',
  // El sistema es interno: no debe aparecer en buscadores.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Sin límite de acercamiento: limitarlo rompe la accesibilidad para quien
  // necesita ampliar el texto.
  maximumScale: 5,
};

/**
 * El idioma se resuelve aquí, en el servidor, leyendo la cookie que deja el
 * selector. Así la primera pintura ya llega en el idioma elegido y el atributo
 * lang del documento es correcto desde el principio, sin destello ni corrección
 * posterior. RN-010.
 *
 * Leer la cookie obliga a renderizar bajo demanda en lugar de estáticamente. Es
 * el precio correcto: todo lo que hay detrás del acceso es personal de quien
 * mira y no se podría servir desde una caché compartida de todos modos.
 */
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): Promise<React.ReactElement> {
  const store = await cookies();
  const language = resolveLanguage(store.get(LANGUAGE_COOKIE_NAME)?.value);

  return (
    // El tema claro es el de partida, sin importar la preferencia del sistema.
    // Quien prefiera el oscuro lo pide con el conmutador del encabezado.
    <html lang={language} data-theme="light" suppressHydrationWarning>
      <body className="min-h-dvh">
        <LanguageProvider initialLanguage={language}>{children}</LanguageProvider>
      </body>
    </html>
  );
}

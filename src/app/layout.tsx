import type { Metadata, Viewport } from 'next';

import './globals.css';

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
 * El idioma se fija provisionalmente en inglés. Pasará a resolverse desde la
 * preferencia del usuario cuando entre la infraestructura de traducciones.
 * RN-010.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}

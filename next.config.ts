import type { NextConfig } from 'next';

/**
 * Cabeceras de seguridad aplicadas a toda respuesta.
 *
 * La política de contenido no está aquí. Necesita un valor de un solo uso por
 * petición para permitir los scripts propios sin abrir la puerta a los ajenos,
 * y eso solo se puede generar en el middleware. Llega junto con el trabajo de
 * autenticación. Ver docs/standards/configuration-and-secrets.md
 */
const securityHeaders = [
  // Impide que el navegador adivine el tipo de contenido, que es como se
  // convierte una carga de usuario en un script ejecutable.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Nadie puede incrustar la aplicación en un marco, ni siquiera nosotros.
  { key: 'X-Frame-Options', value: 'DENY' },
  // No filtrar la ruta completa al navegar a un sitio externo: las rutas
  // llevan identificadores de empresa y de documento.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Se niegan de antemano las capacidades del navegador que no usamos.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  // Obliga a usar transporte cifrado durante dos años, incluidos subdominios.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Rutas comprobadas en tiempo de compilación: un enlace a una ruta que no
  // existe deja de ser un error de ejecución.
  typedRoutes: true,

  // La cabecera delata la versión del servidor sin dar nada a cambio.
  poweredByHeader: false,

  eslint: {
    // El linter corre como paso propio de la verificación. Repetirlo en cada
    // compilación solo la hace más lenta.
    ignoreDuringBuilds: true,
  },

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;

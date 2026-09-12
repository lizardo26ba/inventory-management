import { LanguageProvider } from '@/lib/i18n';

/**
 * Raíz del prototipo.
 *
 * El idioma se monta aquí y no dentro del marco de la aplicación, porque la
 * pantalla de acceso también se lee, y quien entra en español espera que el
 * formulario de acceso ya esté en español.
 *
 * Está por encima de los archivos loading.tsx, así que los esqueletos de carga
 * también hablan el idioma elegido.
 */
export default function PrototypeLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  return <LanguageProvider>{children}</LanguageProvider>;
}

/**
 * Cabecera de pantalla.
 *
 * Tres cosas siempre en el mismo sitio: de dónde se viene, dónde se está y una
 * frase que dice para qué sirve esta pantalla. La acción principal va a la
 * derecha del título y no al final del contenido, porque al final la tapa la
 * tabla y hay que desplazarse para encontrarla.
 *
 * El enlace de vuelta va encima del título y no debajo. Quien se equivocó de
 * pantalla se va antes de leer el resto.
 *
 * Las pantallas de primer nivel no llevan vuelta: la navegación del marco ya
 * dice dónde están.
 */

import Link from 'next/link';

export function PageHeader({
  title,
  subtitle,
  back,
  children,
}: {
  readonly title: string;
  readonly subtitle?: string;
  readonly back?: { readonly href: string; readonly label: string };
  readonly children?: React.ReactNode;
}): React.ReactElement {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        {back !== undefined ? (
          <Link
            href={back.href as never}
            className="text-text-muted hover:text-text text-sm hover:underline"
          >
            {back.label}
          </Link>
        ) : null}

        <h1
          className={`text-2xl font-semibold tracking-tight${back !== undefined ? 'mt-2' : ''}`}
        >
          {title}
        </h1>

        {subtitle !== undefined ? (
          <p className="text-text-muted mt-1 text-sm">{subtitle}</p>
        ) : null}
      </div>

      {children}
    </header>
  );
}

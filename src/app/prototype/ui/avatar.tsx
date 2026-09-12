/**
 * Retrato de una persona, siempre redondo.
 *
 * Si no hay foto, dibuja las iniciales. Nunca deja un hueco: una lista con
 * huecos irregulares se lee peor que una con iniciales.
 *
 * La foto va como fondo de un elemento y no como imagen: así se recorta al
 * círculo sin deformarse, sea cual sea la proporción del archivo original.
 * Es decorativa, porque el nombre siempre está al lado.
 */

export function Avatar({
  name,
  photoUrl,
  className = 'h-8 w-8',
}: {
  readonly name: string;
  readonly photoUrl?: string;
  readonly className?: string;
}): React.ReactElement {
  const initials = name
    .split(' ')
    .filter((part) => part !== '')
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  if (photoUrl !== undefined && photoUrl !== '') {
    return (
      <span
        aria-hidden="true"
        role="presentation"
        style={{ backgroundImage: `url(${photoUrl})` }}
        className={`ring-border shrink-0 rounded-full bg-cover bg-center ring-1 ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`bg-surface-muted text-text-muted ring-border flex shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1 ${className}`}
    >
      {initials}
    </span>
  );
}

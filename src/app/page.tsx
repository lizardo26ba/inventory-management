/**
 * Página provisional. Existe solo para confirmar que el andamiaje levanta y que
 * las fichas de diseño se aplican en tema claro y oscuro.
 *
 * Se reemplaza por el acceso al sistema cuando entre la autenticación. Su texto
 * está escrito fijo a propósito y de forma temporal, porque la infraestructura
 * de traducciones todavía no existe. RN-011.
 */
export default function HomePage(): React.ReactElement {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <div
        className="rounded-[var(--radius-card)] border p-8"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        {/* El distintivo de entorno llegará de la configuración tipada, no de
            process.env, que solo puede leerse dentro de src/lib/config. */}
        <h1 className="text-3xl font-semibold" style={{ color: 'var(--color-text)' }}>
          Inventario
        </h1>

        <p
          className="mt-4 text-sm leading-relaxed"
          style={{ color: 'var(--color-text-muted)' }}
        >
          El andamiaje está en pie. Las siguientes piezas son el módulo de configuración, la
          capa de datos, las traducciones y la autenticación.
        </p>

        <div
          className="mt-8 flex flex-wrap gap-2 border-t pt-6"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {(
            [
              ['Base de datos', 'var(--color-success)', 'var(--color-success-soft)'],
              ['Semillas', 'var(--color-success)', 'var(--color-success-soft)'],
              ['Autenticación', 'var(--color-warning)', 'var(--color-warning-soft)'],
            ] as const
          ).map(([label, color, background]) => (
            <span
              key={label}
              className="rounded-[var(--radius-control)] px-3 py-1 text-xs font-medium"
              style={{ color, backgroundColor: background }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}

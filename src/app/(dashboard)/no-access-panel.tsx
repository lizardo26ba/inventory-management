'use client';

/**
 * Quien entró bien pero no alcanza ninguna empresa.
 *
 * No es un error suyo ni un fallo del sistema: es una cuenta a la que todavía no
 * le han concedido acceso. Decirlo con todas las letras evita que la persona
 * crea que algo se rompió, y le dice a quién acudir.
 *
 * Dibuja con la pieza compartida en lugar de a mano. La marca es la misma que la
 * de una página que no existe y la de una sección que no se puede abrir, y
 * tenerla escrita tres veces era el defecto, no la coincidencia.
 */

import { EmptyState } from '@/components/ui/empty-state';
import { useCopy } from '@/lib/i18n';

export function NoAccessPanel({ email }: { readonly email: string }): React.ReactElement {
  const copy = useCopy();

  return (
    <EmptyState title={copy.noAccess.title} message={copy.noAccess.body}>
      {/* A quién hay que nombrar al pedir el acceso. */}
      <span className="text-text-muted text-xs">{email}</span>
    </EmptyState>
  );
}

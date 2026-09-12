import { AppShell } from '../app-shell';
import { CompanyStoreProvider } from '../company-store';
import { UserStoreProvider } from '../user-store';

/**
 * Envuelve las pantallas del prototipo que van dentro de la aplicación. El
 * acceso al sistema queda fuera de este grupo porque no lleva navegación.
 *
 * Los almacenes se montan aquí y no en cada página para que un alta hecha en un
 * formulario siga estando al volver a la lista.
 */
export default function PrototypeShellLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <CompanyStoreProvider>
      <UserStoreProvider>
        <AppShell>{children}</AppShell>
      </UserStoreProvider>
    </CompanyStoreProvider>
  );
}

import { AppShell } from '../app-shell';
import { CompanyStoreProvider } from '../company-store';
import { ResultDialogProvider } from '../ui/result-dialog';
import { UserStoreProvider } from '../user-store';
import { WarehouseStoreProvider } from '../warehouse-store';

/**
 * Envuelve las pantallas del prototipo que van dentro de la aplicación. El
 * acceso al sistema queda fuera de este grupo porque no lleva navegación.
 *
 * Los almacenes se montan aquí y no en cada página para que un alta hecha en un
 * formulario siga estando al volver a la lista. El de almacenes va dentro del
 * de empresas porque recorta su lista a la empresa activa.
 */
export default function PrototypeShellLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): React.ReactElement {
  return (
    <CompanyStoreProvider>
      <WarehouseStoreProvider>
        <UserStoreProvider>
          <ResultDialogProvider>
            <AppShell>{children}</AppShell>
          </ResultDialogProvider>
        </UserStoreProvider>
      </WarehouseStoreProvider>
    </CompanyStoreProvider>
  );
}

'use client';

/**
 * Menú de acciones de una fila de usuario.
 *
 * Mismas reglas que el de empresas: Escape cierra y devuelve el foco, las
 * flechas recorren, el clic fuera cierra y se recoloca al desplazar. Eliminar
 * abre una confirmación, porque quita el acceso a todas las empresas de golpe.
 */

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';

import { ConfirmDialog } from '../../ui/confirm-dialog';
import { useCopy } from '@/lib/i18n';
import { IconMore, IconPencil, IconTrash } from '../../ui/icons';
import { useUserStore } from '../../user-store';
import { type User } from '../../users-data';

const MENU_WIDTH_PX = 176;
const MENU_GAP_PX = 4;

export function UserRowMenu({ user }: { readonly user: User }): React.ReactElement {
  const copy = useCopy();

  const menuId = useId();
  const router = useRouter();
  const { deleteUser } = useUserStore();

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const isOpen = position !== null;

  function placeMenu(): void {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect === undefined) return;
    setPosition({ top: rect.bottom + MENU_GAP_PX, left: rect.right - MENU_WIDTH_PX });
  }

  function close(options?: { readonly returnFocus?: boolean }): void {
    setPosition(null);
    if (options?.returnFocus === true) triggerRef.current?.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (!isOpen) return;
    const firstItem = menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]');
    firstItem?.focus({ preventScroll: true });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function onPointerDown(event: MouseEvent): void {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) === true) return;
      if (triggerRef.current?.contains(target) === true) return;
      close();
    }

    function onScrollOrResize(): void {
      placeMenu();
    }

    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [isOpen]);

  function onMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      close({ returnFocus: true });
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    event.preventDefault();
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
    );
    if (items.length === 0) return;

    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = (currentIndex + step + items.length) % items.length;
    items[nextIndex]?.focus({ preventScroll: true });
  }

  const fullName = `${user.firstName} ${user.lastName}`;

  const actions = [
    {
      label: copy.users.edit,
      Icon: IconPencil,
      run: () => router.push(`/prototype/users/${user.id}/edit` as never),
    },
    {
      label: copy.users.delete,
      Icon: IconTrash,
      isDestructive: true,
      run: () => setIsConfirmingDelete(true),
    },
  ] as const;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={() => (isOpen ? close() : placeMenu())}
        className="hover:bg-surface-muted text-text-muted hover:text-text rounded-control p-1.5 transition-colors"
      >
        <IconMore className="h-4 w-4" />
        <span className="sr-only">
          {copy.users.rowMenu} · {fullName}
        </span>
      </button>

      {position !== null ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={`${copy.users.rowMenu} · ${fullName}`}
          onKeyDown={onMenuKeyDown}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            width: MENU_WIDTH_PX,
          }}
          className="border-border bg-surface rounded-control z-50 border py-1 shadow-lg"
        >
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              onClick={() => {
                close();
                action.run();
              }}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                'isDestructive' in action
                  ? 'text-danger hover:bg-danger-soft'
                  : 'hover:bg-surface-muted'
              }`}
            >
              <action.Icon className="h-4 w-4 shrink-0" />
              {action.label}
            </button>
          ))}
        </div>
      ) : null}

      {isConfirmingDelete ? (
        <ConfirmDialog
          title={copy.users.deleteTitle}
          description={`${fullName}. ${copy.users.deleteWarning}`}
          confirmLabel={copy.users.deleteConfirm}
          cancelLabel={copy.users.deleteCancel}
          isDestructive
          onCancel={() => setIsConfirmingDelete(false)}
          // El diálogo no se cierra al pulsar: se cierra cuando la
          // eliminación termina. Cerrarlo antes dejaría la fila a la vista
          // como si no hubiera pasado nada.
          onConfirm={async () => {
            await deleteUser(user.id);
            setIsConfirmingDelete(false);
          }}
        />
      ) : null}
    </>
  );
}

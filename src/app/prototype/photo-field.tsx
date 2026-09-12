'use client';

/**
 * Carga de la foto de una persona.
 *
 * En el prototipo la imagen se lee en el navegador y se guarda incrustada en el
 * propio dato, porque no hay servidor donde dejarla. Eso tiene un límite real:
 * una imagen incrustada pesa un tercio más que el archivo, así que se rechazan
 * las mayores de dos megas.
 *
 * En la aplicación real la foto se sube a un almacén de objetos y lo que se
 * guarda es su ruta, nunca la imagen dentro de la base de datos.
 *
 * El campo nativo de archivo es feo y no se puede dar estilo, así que se oculta
 * y se acciona desde un botón. Sigue siendo el campo real: quien navegue con
 * teclado o con lector de pantalla llega a él por su etiqueta.
 */

import { useRef, useState } from 'react';

import { Avatar } from './ui/avatar';
import { useCopy } from '@/lib/i18n';

const MAX_BYTES = 2 * 1024 * 1024;

export function PhotoField({
  name,
  photoDataUrl,
  onChange,
}: {
  readonly name: string;
  readonly photoDataUrl: string | undefined;
  readonly onChange: (next: string | undefined) => void;
}): React.ReactElement {
  const copy = useCopy();

  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (file === undefined) return;

    if (!file.type.startsWith('image/')) {
      setError(copy.userForm.photoInvalidType);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(copy.userForm.photoTooLarge);
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') onChange(reader.result);
    });
    reader.readAsDataURL(file);
  }

  const hasPhoto = photoDataUrl !== undefined && photoDataUrl !== '';

  return (
    <div>
      <label htmlFor="user-photo" className="block text-sm font-medium">
        {copy.userForm.photo}
      </label>

      <div className="mt-2 flex items-center gap-4">
        <Avatar name={name} photoUrl={photoDataUrl} className="h-16 w-16" />

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            id="user-photo"
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="sr-only"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="border-border hover:bg-surface-muted rounded-control h-9 border px-3 text-sm transition-colors"
          >
            {hasPhoto ? copy.userForm.photoReplace : copy.userForm.photoAdd}
          </button>

          {hasPhoto ? (
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setError(null);
                if (inputRef.current !== null) inputRef.current.value = '';
              }}
              className="text-danger hover:bg-danger-soft rounded-control h-9 px-3 text-sm transition-colors"
            >
              {copy.userForm.photoRemove}
            </button>
          ) : null}
        </div>
      </div>

      {error !== null ? (
        <p role="alert" className="text-danger mt-2 text-xs">
          {error}
        </p>
      ) : (
        <p className="text-text-muted mt-2 text-xs">{copy.userForm.photoHelp}</p>
      )}
    </div>
  );
}

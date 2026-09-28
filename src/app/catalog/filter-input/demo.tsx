'use client';

import { useState } from 'react';

import { FilterInput } from '@/components/ui/filter-input';

const SAMPLE_PERMISSIONS = [
  'Ver productos',
  'Crear productos',
  'Registrar entradas',
  'Registrar salidas',
  'Ver bitácora',
] as const;

export function FilterInputDemo(): React.ReactElement {
  const [query, setQuery] = useState('');
  const visible = SAMPLE_PERMISSIONS.filter((permission) =>
    permission.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="max-w-xs space-y-3">
      <FilterInput value={query} onChange={setQuery} placeholder="Filtrar permisos" />
      <ul className="text-sm">
        {visible.map((permission) => (
          <li key={permission} className="py-1">
            {permission}
          </li>
        ))}
      </ul>
    </div>
  );
}

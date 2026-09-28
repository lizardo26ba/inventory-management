'use client';

import { useState } from 'react';

import { type Choice, ChoiceList } from '@/components/ui/choice-list';
import { Monogram } from '@/components/ui/monogram';
import { Tag } from '@/components/ui/tag';

const SAMPLE_COMPANIES = [
  { key: 'fla', name: 'Farmacia Los Altos', city: 'Quetzaltenango', role: 'Administrador' },
  { key: 'dnc', name: 'Distribuidora Norte Central', city: 'Cobán', role: 'Almacén' },
  { key: 'fsa', name: 'Ferretería San Andrés', city: 'Antigua Guatemala', role: 'Consulta' },
] as const;

export function ChoiceListDemo(): React.ReactElement {
  const [selected, setSelected] = useState<string | null>(null);

  const choices: readonly Choice[] = SAMPLE_COMPANIES.map((company) => ({
    key: company.key,
    title: company.name,
    description: company.city,
    leading: <Monogram text={company.name} />,
    meta: <Tag>{company.role}</Tag>,
    onSelect: () => setSelected(company.name),
  }));

  return (
    <div className="max-w-md space-y-3">
      <ChoiceList label="Empresas" choices={choices} />
      <p className="text-text-muted text-sm" aria-live="polite">
        {selected === null ? 'Elige una empresa.' : `Elegiste ${selected}.`}
      </p>
    </div>
  );
}
